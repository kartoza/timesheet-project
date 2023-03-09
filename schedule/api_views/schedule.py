from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from schedule.models import Schedule


class ScheduleSerializer(serializers.ModelSerializer):
    group = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    start = serializers.SerializerMethodField()
    end = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()

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
            'project_name'
        ]


class ScheduleList(APIView):

    def get(self, request, format=None):
        schedules = Schedule.objects.all()
        return Response(ScheduleSerializer(
            schedules, many=True
        ).data)
