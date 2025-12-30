import re

from django.db.models import F, CharField, Value
from django.db.models.functions import Concat, Round
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

from timesheet.models import Task, Project


@extend_schema(
    tags=['Timesheet'],
    summary="Autocomplete task search by project",
    description="""
Search for active tasks within a specific project with autocomplete functionality.

**How to use:**
1. Provide the project ID in the URL path
2. Optionally add a search query parameter `q` to filter tasks by name
3. Returns tasks with their progress (actual time / expected time)

**Example usage:**
- `/api/task-list/5/` - Get all active tasks for project 5
- `/api/task-list/5/?q=bug` - Search for tasks containing "bug" in project 5
- `/api/task-list/10/?q=feature` - Search for tasks containing "feature" in project 10

**Response format:**
Each task includes:
- `id`: Task ID
- `name`: Task name
- `label`: Formatted label with progress (e.g., "Fix login bug (5.5/8.0)")
    """,
    parameters=[
        OpenApiParameter(
            name='project_id',
            type=OpenApiTypes.INT,
            location=OpenApiParameter.PATH,
            required=True,
            description='ID of the project to search tasks in',
            examples=[
                OpenApiExample('Project 1', value=1),
                OpenApiExample('Project 5', value=5),
            ]
        ),
        OpenApiParameter(
            name='q',
            type=OpenApiTypes.STR,
            location=OpenApiParameter.QUERY,
            required=False,
            description='Search query for task name (case-insensitive, partial match). If not provided, returns all active tasks.',
            examples=[
                OpenApiExample('Search for bug', value='bug'),
                OpenApiExample('Search for feature', value='feature'),
                OpenApiExample('Empty search', value=''),
            ]
        )
    ],
    responses={
        200: {
            'description': 'List of matching tasks with progress information',
            'content': {
                'application/json': {
                    'schema': {
                        'type': 'array',
                        'items': {
                            'type': 'object',
                            'properties': {
                                'id': {'type': 'integer', 'description': 'Task ID'},
                                'name': {'type': 'string', 'description': 'Task name'},
                                'label': {'type': 'string', 'description': 'Formatted label with progress (actual/expected hours)'}
                            }
                        }
                    },
                    'example': [
                        {'id': 1, 'name': 'Fix login bug', 'label': 'Fix login bug (5.5/8.0)'},
                        {'id': 2, 'name': 'Add new feature', 'label': 'Add new feature (12.0/20.0)'}
                    ]
                }
            }
        },
        404: {
            'description': 'Project not found'
        }
    }
)
class TaskAutocomplete(APIView):

    queryset = Task.objects.all()

    def get(self, request, project_id):
        project = get_object_or_404(
            Project,
            id=project_id
        )
        query = request.GET.get('q', '')

        self.queryset = self.queryset.filter(
            project=project,
            name__icontains=query,
            active=True
        )

        tasks = self.queryset.annotate(
            label=Concat('name',
                         Value(' ('),
                         Round(F('actual_time'), 2),
                         Value('/'),
                         Round(F('expected_time'), 2),
                         Value(')'), output_field=CharField())
        ).values(
            'id', 'label', 'name'
        )

        for task in tasks:
            task['label'] = re.sub(' +', ' ', task['label'])

        return Response(
            tasks
        )
