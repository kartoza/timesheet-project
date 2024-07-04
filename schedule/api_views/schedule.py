import csv
import time

import pytz
from django.db.models import Q
from django.http import Http404, HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page, never_cache
from rest_framework import serializers
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from datetime import datetime, timedelta, date
from dateutil.relativedelta import relativedelta

from schedule.models import Schedule, UserProjectSlot
from timesheet.models import Task

START_TIME = 'start_time'
END_TIME = 'end_time'
DURATION = 'duration'
SCHEDULES = 'schedules'
ID = 'id'


def _naive(date_obj):
    return date_obj.astimezone(pytz.UTC).replace(tzinfo=None).replace(
        hour=0, minute=0, second=0, microsecond=0
    )


def update_countdown(task: Task, hours=7):
    current_year = date.today().year
    start_date = date(current_year, 1, 1)
    end_date = date(current_year, 12, 31)

    all_schedules = Schedule.objects.filter(
        task=task,
        start_time__range=(start_date, end_date)
    )
    remaining_days = int(
        (task.expected_time - task.actual_time) / hours
    )
    task_last_update = task.last_update
    schedule_before_last_update = all_schedules.filter(
        end_time__lt=task_last_update
    ).order_by('-start_time')
    schedule_after_last_update = all_schedules.filter(
        end_time__gte=task_last_update
    ).order_by('start_time')
    for schedule in schedule_after_last_update:
        start_time = _naive(schedule.start_time)
        end_time = _naive(schedule.end_time)
        schedule.first_day_number = remaining_days
        remaining_days -= ((
                                   end_time - start_time
                           ).days - 1)
        remaining_days -= 1
        schedule.last_day_number = remaining_days
        schedule.save()
        remaining_days -= 1

    remaining_days = int(
        (task.expected_time - task.actual_time) / hours
    )
    if schedule_after_last_update.exists():
        remaining_days += 1

    for schedule in schedule_before_last_update:
        start_time = _naive(schedule.start_time)
        end_time = _naive(schedule.end_time)
        schedule.first_day_number = remaining_days
        remaining_days += ((
                                   end_time - start_time
                           ).days - 1)
        remaining_days += 1
        schedule.last_day_number = remaining_days
        schedule.save()
        remaining_days += 1

    return all_schedules


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
        start_time, task_id, remaining_days,
        excluded_schedules=None):
    # Initialize the list to store updated schedules' IDs
    updated_schedules = []

    # Query the previous schedules based on the given start
    # _time and task_id, ordered by start_time in descending order
    prev_schedules = Schedule.objects.filter(
        start_time__lte=start_time,
        task_id=task_id
    ).order_by('-start_time')

    # If an excluded_schedule is provided, exclude it from the query
    if excluded_schedules:
        prev_schedules = prev_schedules.exclude(id__in=excluded_schedules)

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
    ).order_by('start_time').distinct()

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
    task_id = serializers.SerializerMethodField()
    first_day = serializers.IntegerField(source='first_day_number')
    last_day = serializers.IntegerField(source='last_day_number')
    user = serializers.SerializerMethodField()

    def get_user(self, obj: Schedule):
        if obj.user:
            return obj.user.first_name + ' ' + obj.user.last_name
        if obj.user_project and obj.user_project.user:
            return obj.user_project.user.first_name + ' ' + obj.user_project.user.last_name
        return ''

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
            if obj.activity:
                return obj.activity.name
            return '-'

    def get_task_id(self, obj: Schedule):
        if obj.task:
            return obj.task.id
        return ''

    def get_project_name(self, obj: Schedule):
        return obj.user_project.project.name if obj.user_project else 'Kartoza'

    def get_group(self, obj: Schedule):
        if obj.user_project:
            return obj.user_project.id
        if obj.user:
            return obj.user.id * 1000000
        return ''

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
            'task_id',
            'task_name',
            'task_label',
            'first_day',
            'last_day',
            'notes',
            'user',
            'hours_per_day'
        ]


class ScheduleList(APIView):
    permission_classes = []

    @method_decorator(cache_page(60 * 60 * 24), name='dispatch')
    def get(self, request, format=None):
        timeline_id = self.request.GET.get('timelineId', None)
        if not timeline_id:
            if request.user.is_anonymous:
                return Response([])

        current_date = date.today()

        start_date = current_date - relativedelta(months=6)
        end_date = current_date + relativedelta(months=6)

        schedules = Schedule.objects.filter(
            (
                Q(user_project__isnull=False) & Q(user_project__user__is_active=True)
            ) | (
                Q(user_project__isnull=True)
            ),
            (
                Q(user__isnull=False) & Q(user__is_active=True)
            ) | (
                Q(user__isnull=True)
            ),
            start_time__range=(start_date, end_date),
        )
        if timeline_id:
            schedules = schedules.filter(
                user_project__project__publictimeline__id=timeline_id
            ).distinct()

        response = Response(ScheduleSerializer(
            schedules, many=True
        ).data)

        response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'

        return response


class WeeklyScheduleList(APIView):
    permission_classes = [IsAuthenticated, ]

    def duration(self, start_time: str, end_time: str) -> int:
        start_date = datetime.strptime(start_time, "%Y-%m-%d").date()
        end_date = datetime.strptime(end_time, "%Y-%m-%d").date()
        return (end_date - start_date).days + 1

    def get(self, request, format=None):
        today = datetime.today()
        start_of_week = today - timedelta(days=today.weekday())
        dates = [start_of_week + timedelta(days=i) for i in range(5)]

        schedules = Schedule.objects.filter(
            user_project__user=request.user,
            start_time__gte=_naive(dates[0]),
            start_time__lte=_naive(dates[4])
        ).order_by('start_time', 'end_time').distinct()

        schedules_data = ScheduleSerializer(
            schedules, many=True
        ).data

        dates = [str(_naive(date)).split(' ')[0] for date in dates]

        # Extracting the dates from the schedules
        last_schedule = None
        index = 0
        processed_schedules = []
        for schedule in schedules_data:
            start_time = schedule[START_TIME].split('T')[0]
            end_time = schedule[END_TIME].split('T')[0]
            if not last_schedule:
                if start_time != dates[0]:
                    processed_schedules.insert(index, {
                        ID: None,
                        START_TIME: datetime.strptime(dates[0], '%Y-%m-%d').date(),
                        END_TIME: datetime.strptime(start_time, '%Y-%m-%d').date() - timedelta(days=1),
                        DURATION: self.duration(dates[0], str(
                            datetime.strptime(start_time, '%Y-%m-%d').date() - timedelta(days=1)))
                    })
                    index += 1
            else:
                if datetime.strptime(start_time, '%Y-%m-%d').date() != last_schedule[END_TIME] + timedelta(days=1):
                    new_start_time = (
                         last_schedule['end_time'] + timedelta(days=1)
                    )
                    new_end_time = datetime.strptime(start_time, '%Y-%m-%d').date() - timedelta(days=1)
                    if new_start_time > datetime.strptime(dates[-1], '%Y-%m-%d').date():
                        new_start_time = datetime.strptime(dates[0], '%Y-%m-%d').date()
                    elif new_end_time < new_start_time:
                        processed_schedules.insert(index, {
                            'id': None,
                            'start_time': new_start_time,
                            'end_time': datetime.strptime(dates[-1], '%Y-%m-%d').date(),
                            'duration': self.duration(str(new_start_time), dates[-1])
                        })
                        index += 1
                        new_start_time = datetime.strptime(dates[0], '%Y-%m-%d').date()

                    processed_schedules.insert(index, {
                        'id': None,
                        'start_time': new_start_time,
                        'end_time': new_end_time,
                        'duration': self.duration(str(new_start_time), str(new_end_time))
                    })
                    index += 1
            processed_schedules.append(schedule)
            last_schedule = schedule
            index += 1

            schedule[START_TIME] = datetime.strptime(start_time, '%Y-%m-%d').date()
            schedule[END_TIME] = datetime.strptime(end_time, '%Y-%m-%d').date()
            schedule[DURATION] = self.duration(start_time, end_time)

        return Response({
            'dates': dates,
            'schedules': processed_schedules
        })


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
        last_task_update = _naive(task.last_update)
        start_time = _naive(schedule.start_time)
        end_time = _naive(schedule.end_time)
        schedule.delete()

        if start_time < last_task_update:
            prev_schedule = Schedule.objects.filter(
                task=task,
                start_time__lt=last_task_update,
                start_time__gte=start_time
            )
            if not prev_schedule.exists():
                start_time = last_task_update

        remaining_task_days = calculate_remaining_task_days(
            task,
            start_time,
            end_time
        )
        updated = update_subsequent_schedules(
            start_time=schedule.start_time,
            task_id=task.id,
            last_day_number=remaining_task_days + 1
        )

        if start_time <= last_task_update:
            updated_previous = update_previous_schedules(
                start_time,
                task.id,
                remaining_task_days,
                excluded_schedules=updated
            )
            updated += updated_previous

        schedules = Schedule.objects.filter(
            id__in=updated
        ).distinct()

        return Response({
            'removed': True,
            'updated': ScheduleSerializer(schedules, many=True).data
        })


class UpdateSchedule(APIView):
    permission_classes = [IsAdminUser]

    def put(self, request):
        schedule_id = request.data.get('schedule_id', None)
        notes = request.data.get('notes', '')
        hours_per_day = request.data.get('hours_per_day')
        if hours_per_day:
            hours_per_day = float(hours_per_day)
        if not schedule_id:
            raise Http404()
        task_id = request.data.get('taskId', None)
        start_time = datetime.strptime(
            request.data.get('start_time'),
            '%d/%m/%Y')
        end_time = datetime.strptime(
            request.data.get('end_time'),
            '%d/%m/%Y')
        schedule = Schedule.objects.get(
            id=schedule_id
        )
        task = schedule.task
        last_task_update = _naive(task.last_update)
        pre_start_time = _naive(schedule.start_time)
        schedule.start_time = start_time
        schedule.end_time = end_time
        schedule.notes = notes
        if hours_per_day:
            schedule.hours_per_day = hours_per_day
        if task_id:
            schedule.task_id = task_id
        schedule.save()

        latest_schedule = Schedule.objects.filter(
            task_id=schedule.task
        ).order_by('-start_time').first()

        remaining_task_days = calculate_remaining_task_days(
            schedule.task,
            schedule.start_time,
            schedule.end_time
        )

        last_day_number = (
                remaining_task_days - (end_time - start_time).days
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

        if start_time < last_task_update:
            excluded_schedules = updated
            excluded_schedules.append(schedule.id)
            updated_previous = update_previous_schedules(
                start_time,
                task.id,
                remaining_task_days,
                excluded_schedules=excluded_schedules
            )
            updated += updated_previous

        return Response(
            ScheduleSerializer(Schedule.objects.filter(
                id__in=updated + [schedule.id]
            ), many=True).data
        )


class AddSchedule(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        task_id = request.data.get('task_id', None)
        user_id = request.data.get('user_id', None)
        hours_per_day = request.data.get('hours_per_day', None)
        notes = request.data.get('notes', '')
        start_time = datetime.fromtimestamp(
            int(request.data.get('start_time')) / 1000
        )
        end_time = datetime.fromtimestamp(
            int(request.data.get('end_time')) / 1000
        )
        if hours_per_day:
            hours_per_day = float(hours_per_day)
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
            remaining_task_days - (end_time - start_time).days
        )

        schedule = Schedule.objects.create(
            user_project=user_project,
            start_time=start_time,
            end_time=end_time,
            task=task,
            first_day_number=remaining_task_days,
            last_day_number=last_day_number,
            notes=notes,
            hours_per_day=hours_per_day
        )

        updated = update_subsequent_schedules(
            start_time=start_time,
            task_id=task.id,
            last_day_number=last_day_number,
            excluded_schedule=schedule
        )

        if start_time < last_update:
            excluded_schedules = updated
            excluded_schedules.append(schedule.id)
            updated_previous = update_previous_schedules(
                start_time,
                task.id,
                remaining_task_days,
                excluded_schedules=excluded_schedules
            )
            updated += updated_previous

        schedules = Schedule.objects.filter(
            id__in=updated
        ).distinct()

        return Response({
            'new': ScheduleSerializer(schedule, many=False).data,
            'updated': ScheduleSerializer(schedules, many=True).data
        })


class ScheduleCSVExport(APIView):
    def get(self, request, project_id, user_id=None):
        schedules = Schedule.objects.filter(
            user_project__project_id=project_id,
        ).order_by('start_time')
        if user_id:
            schedules = schedules.filter(
                user_project__user_id=user_id
            )
        schedules = schedules.distinct()
        serializer = ScheduleSerializer(schedules, many=True)

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="schedule.csv"'

        writer = csv.writer(response)
        writer.writerow([
            'Project', 'User', 'Task', 'Start Time',
            'End Time', 'Days', 'Notes', 'Hours Per Day'])

        for schedule in serializer.data:
            date1 = datetime.fromisoformat(schedule['start_time'].replace("Z", "+00:00"))
            date2 = datetime.fromisoformat(schedule['end_time'].replace("Z", "+00:00"))
            duration = (date2 - date1).days + 1
            writer.writerow(
                [
                 schedule['project_name'],
                 schedule['user'],
                 schedule['task_name'],
                 schedule['start_time'].split('T')[0],
                 schedule['end_time'].split('T')[0],
                 duration,
                 schedule['notes'],
                 schedule['hours_per_day'] if schedule['hours_per_day'] else '7'])

        return response
