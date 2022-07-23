from django.contrib.auth import get_user_model
from django.http import Http404
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from timesheet.models import Timelog, Task, Activity
from timesheet.serializers.timesheet import TimelogSerializer
from timesheet.utils.erp import push_timesheet_to_erp


class UserSerializer(serializers.Serializer):
    id = serializers.CharField(
        max_length=100, required=False)


class TaskSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=100)


class ActivitySerializer(serializers.Serializer):
    id = serializers.CharField(max_length=100)


class TimesheetSerializer(serializers.ModelSerializer):
    user = UserSerializer(required=False)
    task = TaskSerializer(required=True)
    activity = ActivitySerializer(required=True)

    class Meta:
        model = Timelog
        fields = [
            'description',
            'start_time',
            'end_time',
            'user',
            'task',
            'activity',
        ]

    def update(self, instance, validated_data):
        if not validated_data and not instance.end_time:
            instance.end_time = timezone.now()
            instance.save()
        return instance

    def create(self, validated_data):
        user = validated_data.pop('user', None)
        task = validated_data.pop('task')
        start_time = validated_data.pop('start_time')
        end_time = validated_data.pop('end_time')
        activity = validated_data.pop('activity')
        description = validated_data.pop('description', '')

        if not user:
            if self.context['request'].user.is_anonymous:
                raise Http404('User not found')
            user = self.context['request'].user
        else:
            user = get_user_model().objects.get(id=user.get('id'))
        task_id = task.get('id')
        if task_id != '-':
            task = Task.objects.get(id=task.get('id'))
        else:
            task = None
        activity = Activity.objects.get(id=activity.get('id'))

        # Set existing timesheet end_time to now
        Timelog.objects.filter(
            user=user,
            end_time__isnull=True
        ).update(
            end_time=timezone.now()
        )

        # Create a new timesheet
        timesheet = Timelog.objects.create(
            user=user,
            task=task,
            activity=activity,
            start_time=start_time,
            end_time=end_time,
            description=description
        )
        return timesheet


class TimesheetModelViewSet(viewsets.ModelViewSet):
    queryset = Timelog.objects.filter(
        end_time__isnull=True)
    serializer_class = TimesheetSerializer

    def get_serializer_context(self):
        """
        Extra context provided to the serializer class.
        """
        context = super(TimesheetModelViewSet, self).get_serializer_context()
        context.update({
            'request': self.request
        })
        return context

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that
        this view requires.
        """
        permission_classes = []
        if self.action == 'create':
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]


class TimesheetViewSet(viewsets.ViewSet):
    """
    A ViewSet for listing time logs
    """
    def list(self, request):
        queryset = Timelog.objects.filter(
            user=self.request.user,
            submitted=False
        ).order_by('-start_time')
        serializer = TimelogSerializer(queryset, many=True)
        return Response(serializer.data)


class TimeLogDeleteAPIView(APIView):
    def post(self, request):
        timelog_id = request.data.get('id', '')
        timelog = Timelog.objects.get(
            id=timelog_id
        )
        timelog.delete()
        return Response(status=200)


class SubmitTimeLogsAPIView(APIView):
    def post(self, request):
        queryset = Timelog.objects.filter(
            user=self.request.user,
            submitted=False
        )
        push_timesheet_to_erp(queryset, request.user)
        return Response(status=200)
