import time
from datetime import timedelta, datetime
import pytz
from bs4 import BeautifulSoup

from django.contrib.auth import get_user_model
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, viewsets, status
from rest_framework.views import APIView
from rest_framework.authentication import TokenAuthentication, SessionAuthentication
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from preferences import preferences
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

from timesheet.models import Timelog, Task, Activity, Project
from timesheet.serializers.timesheet import TimelogSerializer
from timesheet.utils.erp import push_timesheet_to_erp
from timesheet.utils.time import convert_time_to_user_timezone
from timesheet.utils.timelogs import split_timelog_by_description


def remove_empty_paragraphs(html):
    """
    Removes empty paragraphs (e.g., <p><br></p> or paragraphs that only contain whitespace)
    from the given HTML string.
    """
    soup = BeautifulSoup(html, "html.parser")
    for p in soup.find_all("p"):
        # If the paragraph contains no non-whitespace text, remove it.
        if not p.get_text(strip=True):
            p.decompose()
    return str(soup)


class UserSerializer(serializers.Serializer):
    id = serializers.IntegerField(required=False)


class TaskSerializer(serializers.Serializer):
    id = serializers.IntegerField()


class ActivitySerializer(serializers.Serializer):
    id = serializers.IntegerField()


class ProjectSerializer(serializers.Serializer):
    id = serializers.IntegerField()


class TimesheetSerializer(serializers.ModelSerializer):
    user = UserSerializer(required=False)
    task = TaskSerializer(required=False)
    project = ProjectSerializer(required=False)
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
            'project',
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
        raw_description = validated_data.pop('description', '')
        instance.description = remove_empty_paragraphs(raw_description)
        project_data = validated_data.pop('project')
        task_id = task.get('id')
        instance.project = Project.objects.get(
            id=project_data.get('id')
        )
        if task_id != '-':
            instance.task = Task.objects.get(id=task_id)
        else:
            instance.task = None
        instance.activity = Activity.objects.get(id=activity.get('id'))
        instance.end_time = end_time
        instance.save()

        date_changed = False
        if parent or instance.children.count() > 0:
            if parent:
                if instance.start_time.date() != parent.start_time.date():
                    date_changed = True
                    instance.parent = None
                    instance.save()
            else:
                first_child = Timelog.objects.get(id=instance.children.first().id)
                if instance.start_time.date() != first_child.start_time.date():
                    date_changed = True
                    first_child.parent = None
                    first_child.save()
                    if instance.children.count() > 0:
                        instance.children.all().exclude(
                            id=first_child.id
                        ).update(
                            parent=first_child
                        )

        if date_changed:
            return instance

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
        project_data = validated_data.pop('project')
        start_time = validated_data.pop('start_time')
        end_time = validated_data.get('end_time', None)
        activity = validated_data.pop('activity')
        raw_description = validated_data.pop('description', '')
        description = remove_empty_paragraphs(raw_description)
        parent = validated_data.pop('parent', None)
        _timezone = validated_data.pop('timezone', '')

        if not user:
            if self.context['request'].user.is_anonymous:
                raise Http404('User not found')
            user = self.context['request'].user
        else:
            user = get_user_model().objects.get(id=user.get('id'))
        task_id = task.get('id')
        project = Project.objects.get(
            id=project_data.get('id')
        )
        if task_id != '-':
            task = Task.objects.get(id=task_id)
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
            parent=parent,
            project=project
        )
        return timesheet


@extend_schema(tags=['Timesheet'])
class TimesheetModelViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing timesheets.

    Provides CRUD operations for timesheet entries including creating,
    updating, and deleting time logs.
    """
    queryset = Timelog.objects.all()
    serializer_class = TimesheetSerializer
    authentication_classes = [TokenAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]
    http_method_names = ['post', 'put', 'head', 'options']

    @extend_schema(
        summary="Create a new timesheet entry",
        description="""
Creates a new timesheet entry for tracking time spent on tasks and activities.

**Important notes:**
- `end_time` is **optional**. If not provided, the timesheet will be created as a running timer.
- `user` field is optional and will default to the authenticated user if not provided.
- All ID fields (task, project, activity) must be integers.

**Running Timer:**
When you create a timesheet without `end_time`, it starts a running timer that can be stopped later by updating the entry with an `end_time`.

**Example - Create a completed timesheet:**
```json
{
  "description": "Fixed login bug",
  "start_time": "2025-12-30T14:00:00Z",
  "end_time": "2025-12-30T16:30:00Z",
  "task": {"id": 5},
  "project": {"id": 10},
  "activity": {"id": 1},
  "timezone": "Africa/Johannesburg",
  "parent": 0
}
```

**Example - Start a running timer:**
```json
{
  "description": "Working on new feature",
  "start_time": "2025-12-30T16:00:00Z",
  "task": {"id": 7},
  "project": {"id": 10},
  "activity": {"id": 2},
  "timezone": "Africa/Johannesburg"
}
```
        """,
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'description': {
                        'type': 'string',
                        'description': 'Description of the work done (supports HTML)'
                    },
                    'start_time': {
                        'type': 'string',
                        'format': 'date-time',
                        'description': 'Start time of the timesheet entry'
                    },
                    'end_time': {
                        'type': 'string',
                        'format': 'date-time',
                        'description': 'End time of the timesheet entry. Optional - if not provided, creates a running timer.'
                    },
                    'task': {
                        'type': 'object',
                        'properties': {
                            'id': {'type': 'integer', 'description': 'Task ID'}
                        },
                        'required': ['id']
                    },
                    'project': {
                        'type': 'object',
                        'properties': {
                            'id': {'type': 'integer', 'description': 'Project ID'}
                        },
                        'required': ['id']
                    },
                    'activity': {
                        'type': 'object',
                        'properties': {
                            'id': {'type': 'integer', 'description': 'Activity ID'}
                        },
                        'required': ['id']
                    },
                    'timezone': {
                        'type': 'string',
                        'description': 'Timezone for the timesheet entry',
                        'example': 'Africa/Johannesburg'
                    },
                    'parent': {
                        'type': 'integer',
                        'description': 'Parent timesheet ID if this is a continuation',
                        'default': 0
                    }
                },
                'required': ['description', 'start_time', 'task', 'project', 'activity', 'timezone'],
                'example': {
                    'description': 'Fixed login bug and updated tests',
                    'start_time': '2025-12-30T14:00:00Z',
                    'end_time': '2025-12-30T16:30:00Z',
                    'task': {'id': 5},
                    'project': {'id': 10},
                    'activity': {'id': 1},
                    'timezone': 'Africa/Johannesburg',
                    'parent': 0
                }
            }
        },
        responses={201: TimelogSerializer}
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            TimelogSerializer(instance=serializer.instance, many=False).data,
            status=status.HTTP_201_CREATED,
            headers=headers)

    @extend_schema(
        summary="Update a timesheet entry",
        description="Updates an existing timesheet entry with new information.",
        responses={200: TimelogSerializer}
    )
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


MAX_TIMELOGS = 100


@extend_schema(tags=['Timesheet'])
class TimesheetViewSet(viewsets.ViewSet):
    """
    A ViewSet for listing time logs
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List time logs",
        description="Retrieves a list of time logs for the authenticated user, limited to the most recent 100 entries.",
        responses={200: TimelogSerializer(many=True)}
    )
    def list(self, request):
        today = convert_time_to_user_timezone(
            timezone.now(), request.user.profile.timezone)
        start_of_week = today - timedelta(days=today.weekday())
        start_of_last_week = start_of_week - timedelta(days=7)

        queryset = Timelog.objects.filter(
            user=self.request.user,
        ).order_by('-start_time')
        serializer = TimelogSerializer(queryset[:MAX_TIMELOGS], many=True)
        return Response(serializer.data)


@extend_schema(tags=['Timesheet'])
class TimeLogDeleteAPIView(APIView):
    @extend_schema(
        summary="Delete a time log",
        description="Deletes a specific time log entry. If the log has children, they are reassigned to a new parent.",
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'id': {'type': 'string', 'description': 'ID of the timelog to delete'}
                },
                'required': ['id']
            }
        },
        responses={200: None}
    )
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


@extend_schema(tags=['Timesheet'])
class BreakTimesheet(APIView):
    """
    API endpoint for splitting a timesheet entry into multiple entries.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Break timesheet into multiple entries",
        description="Splits a single timesheet entry into multiple child entries based on bullet points in the description.",
        parameters=[
            OpenApiParameter(
                name='timelog_id',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                description='ID of the timelog to split'
            )
        ],
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'detail': {'type': 'string', 'description': 'Success message'}
                }
            },
            400: {
                'type': 'object',
                'properties': {
                    'detail': {'type': 'string', 'description': 'Error message'}
                }
            }
        }
    )
    def post(self, request, timelog_id):
        user = request.user
        timelog = get_object_or_404(Timelog, pk=timelog_id, user=user)
        created_count = split_timelog_by_description(timelog)
        if created_count == 0:
            return Response(
                {"detail": "Not enough bullet points found to split timelog."},
                status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "detail": f"Timelog split successfully. {created_count} child timelog(s) created."
            },
            status=status.HTTP_200_OK
        )


@extend_schema(tags=['Timesheet'])
class SubmitTimeLogsAPIView(APIView):
    """
    API endpoint for submitting time logs to ERP system.
    """
    @extend_schema(
        summary="Submit time logs to ERP",
        description="Submits all unsubmitted time logs for the authenticated user to the ERP system.",
        responses={
            200: None,
            403: {
                'type': 'object',
                'properties': {
                    'error': {'type': 'string', 'description': 'Error message'}
                }
            }
        }
    )
    def post(self, request):
        unavailable_dates = preferences.TimesheetPreferences.unavailable_dates

        if unavailable_dates:
            unavailable_dates = [_date.strip() for _date in unavailable_dates.split(',') if _date.strip()]
            today = datetime.now(pytz.timezone(preferences.TimesheetPreferences.erp_timezone)).date()

            if str(today) in unavailable_dates:
                return JsonResponse(
                    {'error': 'Timesheet submission is unavailable today.'}, status=403)

        queryset = Timelog.objects.filter(
            user=self.request.user,
            submitted=False
        )
        push_timesheet_to_erp(queryset, request.user)
        return Response(status=200)


@extend_schema(tags=['Timesheet'])
class ClearSubmittedTimesheetsAPIView(APIView):
    """
    API endpoint for clearing submitted timesheets.
    """
    @extend_schema(
        summary="Clear submitted timesheets",
        description="Deletes all submitted timesheets for the authenticated user.",
        responses={200: None}
    )
    def post(self, request):
        queryset = Timelog.objects.filter(
            user=self.request.user,
            submitted=True
        )
        queryset.delete()
        return Response(status=200)
