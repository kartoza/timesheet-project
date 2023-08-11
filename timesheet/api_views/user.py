from datetime import datetime, timedelta

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer

from django.contrib.auth import get_user_model
from django.utils import timezone as tzone
from django.db.models import Q

from timesheet.models.timelog import Timelog
from timesheet.utils.erp import get_detailed_report_data
from timesheet.utils.time import convert_time, convert_time_to_user_timezone


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


class UserSerializer(GeoFeatureModelSerializer):

    point = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()
    task = serializers.SerializerMethodField()
    avatar = serializers.SerializerMethodField()

    def get_avatar(self, obj):
        if obj.profile.profile_picture:
            return obj.profile.profile_picture.url
        return '/static/user_icon.png'
    
    def get_is_active(self, obj):
        now = convert_time_to_user_timezone(
            tzone.now(),
            obj
        )
        user_timelogs = Timelog.objects.filter(
            user=obj
        ).order_by('end_time')
        timelog = user_timelogs.filter(
            Q(start_time__lte=now),
            Q(end_time__gte=now),
        ).last()
        if timelog:
            self.context['timelog'] = timelog
            if timelog.start_time and not timelog.end_time:
                return True
            if timelog.end_time:
                utc_time = convert_time(timelog.end_time, obj)
                return utc_time > tzone.now()
        if user_timelogs.count() > 0 and not timelog:
            timelog = user_timelogs.filter(
                start_time__lte=now,
                end_time__isnull=True).last()
            if timelog:
                self.context['timelog'] = timelog
            return True
        if user_timelogs.count() > 0 and not timelog:
            timelog = user_timelogs.last()
            self.context['timelog'] = timelog
        return False

    def get_point(self, obj):
        return {
            "type": "Point",
            "coordinates": [obj.profile.lon, obj.profile.lat],
        }

    def get_task(self, obj):
        if self.context['timelog'] and self.context['timelog'].task:
            return (
                '{project} - {task}'.format(
                    task=self.context['timelog'].task.name,
                    project=self.context['timelog'].task.project.name)
            )
        if self.context['timelog'] and self.context['timelog'].activity:
            return 'Kartoza - {}'.format(self.context['timelog'].activity.name)
        if self.context['timelog']:
            return 'Kartoza'
        return ''

    class Meta:
        model = get_user_model()
        geo_field = 'point'
        fields = [
            'id',
            'first_name',
            'last_name',
            'avatar',
            'is_active',
            'task'
        ]


class UserActivities(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, **kwargs):
        user_model = get_user_model()
        users = user_model.objects.filter(
            profile__lat__isnull=False
        ).exclude(
            first_name=''
        )

        return Response(
            UserSerializer(users, many=True, context={
                'timelog': {}
            }).data
        )


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
            last_rank = list(last_two_week.keys()).index(key)
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
