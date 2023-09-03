import time
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import Http404
from django.utils import timezone
from rest_framework import serializers, viewsets, status
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
    task = TaskSerializer(required=False)
    activity = ActivitySerializer(required=False)
    editing = serializers.SerializerMethodField()

    def get_editing(self, obj):
        return self.context['request'].data.get('editing', False)

    class Meta:
        model = Timelog
        fields = [
            'description',
            'start_time',
            'end_time',
            'user',
            'task',
            'activity',
            'timezone',
            'parent',
            'editing'
        ]

    def update(self, instance: Timelog, validated_data):
        editing = self.get_editing(instance)
        if instance.end_time and not editing:
            return instance
        start_time = validated_data.pop('start_time', None)
        parent = validated_data.pop('parent', None)
        if start_time:
            instance.start_time = start_time
        end_time = validated_data.get('end_time', None)
        task = validated_data.pop('task')
        activity = validated_data.pop('activity')
        instance.description = validated_data.pop('description', '')
        task_id = task.get('id')
        if task_id != '-':
            instance.task = Task.objects.get(id=task.get('id'))
        else:
            instance.task = None
        instance.activity = Activity.objects.get(id=activity.get('id'))
        instance.end_time = end_time
        instance.save()

        related = []
        if parent:
            related.append(parent.id)
            related += list(
                parent.children.all().exclude(
                    id=instance.id).values_list('id', flat=True)
            )
        if instance.children.count() > 0:
            related += list(
                instance.children.all().values_list('id', flat=True)
            )
        if len(related) > 0:
            Timelog.objects.filter(
                id__in=related
            ).update(
                description=instance.description,
                task=instance.task,
                activity=instance.activity
            )

        return instance

    def create(self, validated_data):
        user = validated_data.pop('user', None)
        task = validated_data.pop('task')
        start_time = validated_data.pop('start_time')
        end_time = validated_data.get('end_time', None)
        activity = validated_data.pop('activity')
        description = validated_data.pop('description', '')
        parent = validated_data.pop('parent', None)
        _timezone = validated_data.pop('timezone', '')

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

        # Check if a parent Timelog exists
        # If the start_date of the new Timelog differs from that of the parent,
        # remove the association to the parent
        if parent:
            parent_start_time = parent.start_time
            if start_time.date() != parent_start_time.date():
                parent = None

        if parent and isinstance(parent, Timelog):
            parent_timelog = Timelog.objects.get(
                id=parent.id
            )
            parent_timelog.description = description
            parent_timelog.save()

        # Create a new timesheet
        timesheet = Timelog.objects.create(
            user=user,
            task=task,
            activity=activity,
            start_time=start_time,
            end_time=end_time,
            description=description,
            timezone=_timezone,
            parent=parent
        )
        return timesheet


class TimesheetModelViewSet(LoginRequiredMixin, viewsets.ModelViewSet):
    queryset = Timelog.objects.all()
    serializer_class = TimesheetSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            TimelogSerializer(instance=serializer.instance, many=False).data,
            status=status.HTTP_201_CREATED,
            headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        if getattr(instance, '_prefetched_objects_cache', None):
            # If 'prefetch_related' has been applied to a queryset, we need to
            # forcibly invalidate the prefetch cache on the instance.
            instance._prefetched_objects_cache = {}
        return Response(
            TimelogSerializer(instance=serializer.instance, many=False).data)

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
    permission_classes = [IsAuthenticated]

    def list(self, request):

        today = timezone.now()
        start_of_week = today - timedelta(days=today.weekday())
        start_of_last_week = start_of_week - timedelta(days=7)

        queryset = Timelog.objects.filter(
            user=self.request.user,
            start_time__gte=start_of_last_week,
            start_time__lt=start_of_week + timedelta(days=7)
        ).order_by('-start_time')
        serializer = TimelogSerializer(queryset, many=True)
        return Response(serializer.data)


class TimeLogDeleteAPIView(APIView):
    def post(self, request):
        timelog_id = request.data.get('id', '')
        timelog = Timelog.objects.get(
            id=timelog_id
        )
        if timelog.children.count() > 0:
            new_parent = Timelog.objects.get(
                id=timelog.children.first().id
            )
            new_parent.parent = None
            new_parent.save()
            if timelog.children.count() > 0:
                timelog.children.all().exclude(
                    id=new_parent.id
                ).update(parent=new_parent)
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


class ClearSubmittedTimesheetsAPIView(APIView):
    def post(self, request):
        queryset = Timelog.objects.filter(
            user=self.request.user,
            submitted=True
        )
        queryset.delete()
        return Response(status=200)
