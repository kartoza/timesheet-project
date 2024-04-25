from datetime import datetime, timedelta, time

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers

from django.contrib.auth import get_user_model
from django.utils import timezone as tzone
from django.db.models import Q
from django.core.cache import cache

from schedule.models import Schedule
from timesheet.models.timelog import Timelog
from timesheet.utils.erp import get_detailed_report_data
from timesheet.utils.time import convert_time, convert_time_to_user_timezone

CACHE_DURATION = 10


class UserTimelogSerializer(serializers.ModelSerializer):

    project = serializers.SerializerMethodField()
    task = serializers.SerializerMethodField()
    activity = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()

    def get_is_active(self, obj):
        if obj.start_time and not obj.end_time:
            return True
        if obj.end_time:
            utc_time = convert_time(obj.end_time, obj.user)
            return utc_time > tzone.now()
        return False

    def get_activity(self, obj):
        if obj.activity:
            return obj.activity.name
        return ''

    def get_project(self, obj):
        if obj.task and obj.task.project:
            return obj.task.project.name
        return 'Kartoza'

    def get_task(self, obj):
        if obj.task:
            return obj.task.name
        return ''

    class Meta:
        model = Timelog
        fields = [
            'activity',
            'project',
            'task',
            'is_active'
        ]


class UserSerializer(serializers.ModelSerializer):

    is_active = serializers.SerializerMethodField()
    task = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()
    duration = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()
    clock = serializers.SerializerMethodField()

    def get_cached_data(self, cache_key, serializer_data):
        cached_data = cache.get(cache_key)
        if cached_data is None:
            cache.set(cache_key, serializer_data, CACHE_DURATION)
            return serializer_data
        return cached_data

    def get_avatar(self, obj):
        if obj.profile.profile_picture:
            return obj.profile.profile_picture.url
        return '/static/user_icon.png'

    def calculate_is_active(self, obj):
        now = convert_time_to_user_timezone(
            tzone.now(),
            obj.profile.timezone
        )
        today_min = tzone.make_aware(tzone.datetime.combine(now.date(), time.min))
        today_max = tzone.make_aware(tzone.datetime.combine(now.date(), time.max))

        user_timelogs_today = Timelog.objects.filter(
            user=obj,
            start_time__gte=today_min,
            start_time__lte=today_max
        ).order_by('end_time')

        total_duration = timedelta()

        for timelog in user_timelogs_today:
            end_time = timelog.end_time if timelog.end_time else now
            duration = end_time - timelog.start_time
            total_duration += duration

        total_duration_hours = total_duration.total_seconds() / 3600.0
        self.context['total_duration_today'] = total_duration_hours

        timelog = user_timelogs_today.filter(
            Q(start_time__lte=now),
            Q(end_time__gte=now),
        ).last()

        if timelog:
            now = convert_time_to_user_timezone(
                tzone.now(),
                timelog.timezone if timelog.timezone else obj.profile.timezone
            )

            self.context['timelog'] = timelog
            if timelog.start_time and not timelog.end_time:
                return True
            if timelog.end_time:
                return timelog.end_time > now

        if user_timelogs_today.count() > 0 and not timelog:
            timelog = user_timelogs_today.filter(
                start_time__lte=now,
                end_time__isnull=True
            ).last()
            if timelog:
                self.context['timelog'] = timelog
                return True

        if user_timelogs_today.count() > 0 and not timelog:
            timelog = user_timelogs_today.last()
            self.context['timelog'] = timelog

        return False

    def get_is_active(self, obj):
        cache_key = f"user_is_active_{obj.pk}"
        cached_data = cache.get(cache_key)
        if cached_data is None:
            is_active = self.calculate_is_active(obj)
            cache.set(cache_key, is_active, CACHE_DURATION)
            return is_active
        return cached_data

    def get_task(self, obj):
        timelog = self.context.get('timelog', None)

        if not timelog:
            return ''

        if timelog.user != obj:
            return ''

        task = timelog.task
        activity = timelog.activity

        if task:
            return f"{task.project.name} - {task.name}"

        if timelog.project:
            return f"{timelog.project.name} - {activity.name}"

        if activity:
            return f"Kartoza - {activity.name}"

        return 'Kartoza'

    def get_duration(self, obj):
        timelog = self.context.get('timelog', None)
        duration = 0
        duration_timedelta = None
        if not timelog or timelog.user != obj:
            return 0

        if timelog.timezone and timelog.timezone != obj.profile.timezone:
            obj.profile.timezone = timelog.timezone
            obj.profile.save()

        now = convert_time_to_user_timezone(
            tzone.now(),
            timelog.timezone if timelog.timezone else obj.profile.timezone
        )

        if timelog.start_time and timelog.end_time and timelog.end_time < now:
            duration_timedelta = timelog.end_time - timelog.start_time
        elif timelog.start_time:
            duration_timedelta = now - timelog.start_time

        if duration_timedelta is not None:
            duration = duration_timedelta.total_seconds() / 3600.0
        return duration

    def get_clock(self, obj):
        timelog = self.context.get('timelog', None)
        if timelog and timelog.user != obj:
            timelog = None
        timezone = obj.profile.timezone

        if timezone == 'UTC':
            return ''

        if timelog and timelog.timezone:
            timezone = timelog.timezone
        now = convert_time_to_user_timezone(
            tzone.now(),
            timezone
        )

        # Check leave status
        if Schedule.objects.filter(
            user=obj,
            activity__name__icontains='leave',
            start_time__lte=now,
            end_time__gte=now
        ).exists():
            return 'On Leave'

        clock_time = now.strftime('%I:%M %p')
        return clock_time

    def get_total(self, obj):
        return self.context.get('total_duration_today', 0)

    class Meta:
        model = get_user_model()
        fields = [
            'id',
            'first_name',
            'last_name',
            'avatar',
            'is_active',
            'task',
            'duration',
            'total',
            'clock'
        ]


class UserActivities(APIView):

    def get_users(self):
        user_model = get_user_model()
        users = user_model.objects.exclude(
            first_name=''
        )
        return users

    def get(self, request, **kwargs):
        cache_key = 'user_activities_sorted_data'
        cached_data = cache.get(cache_key)
        if cached_data is None:
            users = self.get_users()
            serialized_data = UserSerializer(users, many=True, context={'timelog': {}}).data
            sorted_data = sorted(serialized_data, key=lambda x: (not x['is_active'], -x['total']))
            cache.set(cache_key, sorted_data, CACHE_DURATION)
            return Response(sorted_data)

        return Response(cached_data)


class UserLeaderBoard(APIView):
    permission_classes = [IsAuthenticated]
    current_date = datetime.now()

    def report_data(self, weeks):
        summary_data = {}
        end_date = self.current_date - timedelta(days=self.current_date.weekday() + 1 + (weeks * 7))
        start_date = str((end_date - timedelta(days=6))).split(' ')[0]
        end_date = str(end_date).split(' ')[0]

        filters = f'{{"start_date":"{start_date}", "end_date": "{end_date}"}}'
        detailed_report = get_detailed_report_data('', filters)[:-1]
        for report in detailed_report[:-1]:
            employee = report['Employee Name']
            summary_data[employee] = summary_data.get(employee, 0) + report['Hours']
        return dict(sorted(summary_data.items(), key=lambda item: item[1], reverse=True))

    def get(self, request, **kwargs):
        last_week_data = self.report_data(0)
        last_two_week = self.report_data(1)

        report_data = []

        for key, value in last_week_data.items():
            status = 'same'
            current_rank = list(last_week_data.keys()).index(key)
            try:
                last_rank = list(last_two_week.keys()).index(key)
            except ValueError:
                continue
            if value > last_two_week[key]:
                status = 'up'
                if current_rank < last_rank - 2:
                    status += 'up'
            elif value < last_two_week[key]:
                status = 'down'
                if current_rank > last_rank + 2:
                    status += 'down'
            report_data.append({
                'status': status,
                'name': key,
                'hours': value,
                'currentRank': current_rank,
                'lastRank': last_rank
            })

        return Response({
            'leaderboard': report_data
        })
