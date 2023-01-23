from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer

from django.contrib.auth import get_user_model
from django.utils import timezone as tzone
from django.contrib.gis.geos import Point

from timesheet.models.timelog import Timelog
from timesheet.utils.time import convert_time


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
        timelog = self.context['timelog'] = Timelog.objects.filter(
            user=obj
        ).order_by('start_time').last()
        if timelog:
            if timelog.start_time and not timelog.end_time:
                return True
            if timelog.end_time:
                utc_time = convert_time(timelog.end_time, obj)
                return utc_time > tzone.now()
        return None

    def get_point(self, obj):
        return {
            "type": "Point",
            "coordinates": [obj.profile.lon, obj.profile.lat],
        }

    def get_task(self, obj):
        if self.context['timelog'] and self.context['timelog'].task:
            return self.context['timelog'].task.name
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