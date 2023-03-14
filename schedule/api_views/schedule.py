from django.http import Http404
from rest_framework import serializers
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from datetime import datetime

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
            'task_label'
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
        schedule = Schedule.objects.create(
            user_project=user_project,
            start_time=start_time,
            end_time=end_time,
            task=task
        )
        return Response(
            ScheduleSerializer(schedule, many=False).data
        )
