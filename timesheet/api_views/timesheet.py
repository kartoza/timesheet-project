from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.permissions import IsAuthenticated

from timesheet.models import Timesheet, Task


class UserSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=100)
    email = serializers.EmailField(required=False)
    username = serializers.CharField(
        max_length=100, required=False)


class TaskSerializer(serializers.Serializer):
    id = serializers.CharField(max_length=100)
    name = serializers.CharField(
        max_length=256, required=False)


class TimesheetSerializer(serializers.ModelSerializer):
    user = UserSerializer(required=False)
    task = TaskSerializer(required=False)

    class Meta:
        model = Timesheet
        fields = [
            'user', 'start_time', 'end_time', 'task'
        ]

    def update(self, instance, validated_data):
        if not validated_data and not instance.end_time:
            instance.end_time = timezone.now()
            instance.save()
        return instance

    def create(self, validated_data):
        user = validated_data.pop('user')
        task = validated_data.pop('task')

        user = get_user_model().objects.get(id=user.get('id'))
        task = Task.objects.get(id=task.get('id'))
        Timesheet.objects.filter(
            user=user,
            end_time__isnull=True
        ).update(
            end_time=timezone.now()
        )
        timesheet = Timesheet.objects.create(
            user=user,
            task=task,
        )
        return timesheet


class TimesheetViewSet(viewsets.ModelViewSet):
    queryset = Timesheet.objects.filter(
        end_time__isnull=True)
    serializer_class = TimesheetSerializer

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that
        this view requires.
        """
        permission_classes = []
        if self.action == 'create':
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
