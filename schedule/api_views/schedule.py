import pytz
from django.http import Http404
from rest_framework import serializers
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from datetime import datetime

from schedule.models import Schedule, UserProjectSlot
from timesheet.models import Task


def _naive(date_obj):
    return date_obj.astimezone(pytz.UTC).replace(tzinfo=None).replace(
            hour=0, minute=0, second=0, microsecond=0
        )


def calculate_remaining_task_days(
        task: Task, start_time: datetime, end_time: datetime = None,
        excluded_schedule: Schedule = None):
    """
    Calculates the remaining days for a task, considering the task's
    expected time, actual time, and any previous schedules that
    overlap with the task. The remaining task days are
    calculated based on a default of 7 hours of work per day
    :param task: Task object
    :param start_time: The start time of the current schedule being considered
    :param end_time: The end time of the current schedule being considered
    :param excluded_schedule: A schedule excluded from the query
    :return: The remaining task day
    """

    # remaining task time = expected_time - actual_time = 100
    remaining_task_time = task.expected_time - task.actual_time
    # last task update
    last_task_update = task.last_update
    # hours per day ( default to 7 )
    hours_per_day = 7
    # remaining task day = int(100 / 7) = 14
    remaining_task_day = int(remaining_task_time / hours_per_day)

    start_time = _naive(start_time)
    if end_time:
        end_time = _naive(end_time)
    last_task_update = _naive(last_task_update)

    if start_time < last_task_update:
        # Calculate previous schedules before last_task_update and
        # after the new schedule start_time
        previous_schedules_before_update = Schedule.objects.filter(
            task=task,
            start_time__lt=last_task_update,
            start_time__gte=start_time
        ).order_by('-start_time')

        if excluded_schedule:
            previous_schedules_before_update = (
                previous_schedules_before_update.exclude(
                    id=excluded_schedule.id
                )
            )
        for prev_schedule in previous_schedules_before_update:
            prev_start_time = _naive(prev_schedule.start_time)
            prev_end_time = _naive(prev_schedule.end_time)
            if (
                prev_end_time <
                last_task_update
            ):
                remaining_task_day += (
                    prev_end_time - prev_start_time
                ).days + 1
            else:
                remaining_task_day += (
                    last_task_update - prev_start_time
                ).days
        if end_time > last_task_update:
            end_time = last_task_update
        return (
            remaining_task_day +
            (end_time - start_time).days +
            (1 if end_time < last_task_update else 0)
        )
    else:
        # Calculate remaining days
        # e.g. 2 previous schedules
        previous_schedules = Schedule.objects.filter(
            task=task,
            start_time__lt=start_time,
            end_time__gte=last_task_update
        ).order_by('start_time')
        if excluded_schedule:
            previous_schedules = previous_schedules.exclude(
                id=excluded_schedule.id
            )

        for previous_schedule in previous_schedules:
            prev_end_time = _naive(previous_schedule.end_time)
            prev_start_time = _naive(previous_schedule.start_time)
            if prev_start_time > last_task_update:
                remaining_task_day -= (
                    prev_end_time - prev_start_time
                ).days + 1
            elif prev_start_time <= last_task_update:
                remaining_task_day -= (
                    prev_end_time - last_task_update
                ).days + 1
        return remaining_task_day


def update_previous_schedules(
        start_time, task_id, remaining_days, excluded_schedule=None):
    # Initialize the list to store updated schedules' IDs
    updated_schedules = []

    # Query the previous schedules based on the given start
    # _time and task_id, ordered by start_time in descending order
    prev_schedules = Schedule.objects.filter(
        start_time__lte=start_time,
        task_id=task_id
    ).order_by('-start_time')

    # If an excluded_schedule is provided, exclude it from the query
    if excluded_schedule:
        prev_schedules = prev_schedules.exclude(id=excluded_schedule.id)

    # Calculate the first_day value for the first previous schedule in the loop
    first_day = remaining_days

    # If there are previous schedules, update their first_
    # day_number and last_day_number
    if prev_schedules.exists():
        for prev_schedule in prev_schedules:
            first_day += 1
            # Update the last_day_number of the current previous schedule
            prev_schedule.last_day_number = first_day

            # Calculate the duration of the current previous schedule
            duration = (
                prev_schedule.end_time -
                prev_schedule.start_time
            ).days

            # Update the first_day value for the next
            # previous schedule in the loop
            first_day = first_day + duration

            # Update the first_day_number of the current previous schedule
            prev_schedule.first_day_number = first_day

            # Save the updated previous schedule to the database
            prev_schedule.save()

            # Append the updated previous schedule's ID
            # to the updated_schedules list
            updated_schedules.append(prev_schedule.id)

    return updated_schedules


def update_subsequent_schedules(start_time,
                                task_id,
                                last_day_number,
                                excluded_schedule=None):
    """
    This function checks for subsequent schedules and updates their first day
    and last day numbers accordingly
    :param start_time: The start time of the schedule
    :param task_id: id of the task
    :param last_day_number: The last day number of the previous task
    :param excluded_schedule: Schedule to be excluded for the query
    :return:
    """
    updated_schedules = []
    sub_schedules = Schedule.objects.filter(
        start_time__gte=start_time,
        task_id=task_id
    ).order_by('start_time')

    if excluded_schedule:
        sub_schedules = sub_schedules.exclude(
            id=excluded_schedule.id
        )

    if sub_schedules.exists():
        # Update the numbers
        for sub_schedule in sub_schedules:
            sub_schedule.first_day_number = last_day_number - 1
            last_day_number = (
                (last_day_number - 1) - (
                    sub_schedule.end_time - sub_schedule.start_time
                ).days
            )
            sub_schedule.last_day_number = last_day_number
            sub_schedule.save()
            updated_schedules.append(sub_schedule.id)

    return updated_schedules


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
        return int(int(obj.start_time.strftime("%s%f")) / 1000)

    def get_end(self, obj: Schedule):
        return int(int(obj.end_time.strftime("%s%f")) / 1000)

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
        task = schedule.task
        start_time = schedule.start_time
        schedule.delete()

        remaining_task_days = calculate_remaining_task_days(
            task,
            start_time,
            schedule.end_time
        )
        update_subsequent_schedules(
            start_time=schedule.start_time,
            task_id=task.id,
            last_day_number=remaining_task_days + 1
        )

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

        task = schedule.task

        remaining_task_days = calculate_remaining_task_days(
            schedule.task, start_time, end_time, excluded_schedule=schedule
        )
        last_day_number = (
            remaining_task_days - (end_time - start_time).days + 1
        )
        schedule.first_day_number = remaining_task_days
        schedule.last_day_number = last_day_number
        schedule.save()

        updated = update_subsequent_schedules(
            start_time=start_time,
            task_id=task.id,
            last_day_number=last_day_number,
            excluded_schedule=schedule
        )
        updated.append(schedule.id)

        if _naive(schedule.start_time) < _naive(task.last_update):
            updated_previous = update_previous_schedules(
                start_time,
                task.id,
                remaining_task_days,
                schedule
            )
            updated += updated_previous

        schedules = Schedule.objects.filter(
            id__in=updated
        ).distinct()

        return Response(
            ScheduleSerializer(schedules, many=True).data
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
        start_time = _naive(start_time)
        end_time = _naive(end_time)

        if not task_id or not user_id:
            raise Http404()
        task = Task.objects.get(id=task_id)
        user_project = UserProjectSlot.objects.get(
            user_id=user_id,
            project=task.project
        )

        last_update = _naive(task.last_update)
        remaining_task_days = calculate_remaining_task_days(
            task, start_time, end_time
        )

        last_day_number = (
            remaining_task_days - (end_time - start_time).days +
            (1 if end_time >= last_update else 0)
        )
        schedule = Schedule.objects.create(
            user_project=user_project,
            start_time=start_time,
            end_time=end_time,
            task=task,
            first_day_number=remaining_task_days,
            last_day_number=last_day_number
        )

        update_subsequent_schedules(
            start_time=start_time,
            task_id=task.id,
            last_day_number=last_day_number,
            excluded_schedule=schedule
        )

        if start_time < last_update:
            update_previous_schedules(
                start_time,
                task.id,
                remaining_task_days,
                schedule
            )

        return Response(
            ScheduleSerializer(schedule, many=False).data
        )
