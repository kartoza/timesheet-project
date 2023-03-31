from django.http import Http404
from rest_framework import serializers
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from datetime import datetime, timedelta

from schedule.models import Schedule, UserProjectSlot
from timesheet.models import Task


class ScheduleSerializer(serializers.ModelSerializer):
    group = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    start = serializers.SerializerMethodField()
    end = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    task_name = serializers.SerializerMethodField()
    task_label = serializers.SerializerMethodField()
    first_day = serializers.IntegerField(source='first_day_number')
    last_day = serializers.IntegerField(source='last_day_number')

    def get_task_label(self, obj: Schedule):
        if not obj.task:
            return '-'
        return (
            f'{obj.task.name} '
            f'({round(obj.task.actual_time, 2)}/'
            f'{round(obj.task.expected_time, 2)})'
        )

    def get_task_name(self, obj: Schedule):
        if obj.task:
            return obj.task.name
        else:
            return '-'

    def get_project_name(self, obj: Schedule):
        return obj.user_project.project.name

    def get_group(self, obj: Schedule):
        return obj.user_project.id

    def get_title(self, obj: Schedule):
        return obj.notes

    def get_start(self, obj: Schedule):
        return int(int(obj.start_time.strftime("%s%f"))/1000)

    def get_end(self, obj: Schedule):
        return int(int(obj.end_time.strftime("%s%f"))/1000)

    class Meta:
        model = Schedule
        fields = [
            'id',
            'group',
            'title',
            'start',
            'end',
            'start_time',
            'end_time',
            'project_name',
            'task_name',
            'task_label',
            'first_day',
            'last_day'
        ]


class ScheduleList(APIView):

    permission_classes = []

    def get(self, request, format=None):
        timeline_id = self.request.GET.get('timelineId', None)
        if not timeline_id:
            if request.user.is_anonymous:
                return Response([])
        schedules = Schedule.objects.all()
        if timeline_id:
            schedules = schedules.filter(
                user_project__project__publictimeline__id=timeline_id
            ).distinct()
        else:
            if not request.user.is_staff:
                schedules = schedules.filter(
                    user_project__user=request.user
                )
        return Response(ScheduleSerializer(
            schedules, many=True
        ).data)


class DeleteSchedule(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        schedule_id = request.data.get('schedule_id', None)
        if not schedule_id:
            raise Http404()
        schedule = Schedule.objects.get(
            id=schedule_id
        )
        schedule.delete()
        return Response({
            'removed': True
        })


class UpdateSchedule(APIView):
    permission_classes = [IsAdminUser]

    def put(self, request):
        schedule_id = request.data.get('schedule_id', None)
        if not schedule_id:
            raise Http404()
        start_time = datetime.strptime(
            request.data.get('start_time'),
            '%d/%m/%Y')
        end_time = datetime.strptime(
            request.data.get('end_time'),
            '%d/%m/%Y')
        schedule = Schedule.objects.get(
            id=schedule_id
        )
        schedule.start_time = start_time
        schedule.end_time = end_time
        schedule.save()
        return Response(
            ScheduleSerializer(schedule, many=False).data
        )


class AddSchedule(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        task_id = request.data.get('task_id', None)
        user_id = request.data.get('user_id', None)
        start_time = datetime.fromtimestamp(
            int(request.data.get('start_time')) / 1000
        )
        end_time = datetime.fromtimestamp(
            int(request.data.get('end_time')) / 1000
        )
        start_time = start_time.replace(
            hour=0, minute=0
        )
        end_time = end_time.replace(
            hour=0, minute=0
        )

        if not task_id or not user_id:
            raise Http404()
        task = Task.objects.get(id=task_id)
        user_project = UserProjectSlot.objects.get(
            user_id=user_id,
            project=task.project
        )

        # remaining task time = expected_time - actual_time = 100
        remaining_task_time = task.expected_time - task.actual_time
        # last task update
        last_task_update = task.last_update
        # hours per day ( default to 7 )
        hours_per_day = 7
        # remaining task day = int(100 / 7) = 14
        remaining_task_day = int(remaining_task_time / hours_per_day)

        # Calculate remaining days
        # e.g. 2 previous schedules
        previous_schedules = Schedule.objects.filter(
            task=task,
            start_time__lte=start_time,
            end_time__gte=last_task_update
        )

        for previous_schedule in previous_schedules:
            if previous_schedule.start_time >= last_task_update:
                remaining_task_day -= (
                    previous_schedule.end_time - previous_schedule.start_time
                ).days
            elif previous_schedule.start_time < last_task_update:
                remaining_task_day -= (
                    previous_schedule.end_time - last_task_update.replace(
                       hour=0, minute=0, second=0, microsecond=0)
                ).days

        last_day_number = (
            remaining_task_day - (end_time - start_time).days + 1
        )
        schedule = Schedule.objects.create(
            user_project=user_project,
            start_time=start_time,
            end_time=end_time,
            task=task,
            first_day_number=remaining_task_day,
            last_day_number=last_day_number
        )

        # update first day and last day of tasks
        # check for subsequent schedules
        sub_schedules = Schedule.objects.filter(
            start_time__gt=start_time,
            task=task
        ).order_by('start_time')

        if sub_schedules.exists():
            # Update the numbers
            for sub_schedule in sub_schedules:
                sub_schedule.first_day_number = last_day_number - 1
                last_day_number = (
                    (last_day_number - 1) - (
                        sub_schedule.end_time - sub_schedule.start_time
                    ).days + 1
                )
                sub_schedule.last_day_number = last_day_number
                sub_schedule.save()

        return Response(
            ScheduleSerializer(schedule, many=False).data
        )
