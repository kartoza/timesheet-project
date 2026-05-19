from drf_spectacular.utils import extend_schema, OpenApiResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from timesheet.models.project import Project

RAG_STATUS_MAP = {
    'GREEN': 'on_track',
    'AMBER': 'delayed',
    'RED': 'at_risk',
}


def _project_status(project):
    if not project.is_active:
        return 'completed'
    return RAG_STATUS_MAP.get((project.rag or '').upper(), 'on_track')


def _user_display(user):
    if not user:
        return None
    full_name = user.get_full_name()
    return full_name if full_name.strip() else user.email


def _serialize_project(project):
    team_members = [
        {
            'id': m.user.id,
            'name': _user_display(m.user),
            'role': m.role,
            'is_lead': m.project_lead,
        }
        for m in project.members.all()
        if m.user
    ]

    subtasks = [
        {
            'id': t.id,
            'name': t.name,
            'budget_time': t.expected_time,
            'consumed_time': t.actual_time,
        }
        for t in project.task_set.filter(active=True)
    ]

    percent = project.percent_complete
    actual_progress = (percent / 100) if percent is not None else None

    return {
        'id': project.id,
        'name': project.name,
        'business_unit': project.business_unit.name if project.business_unit else None,
        'project_type': project.project_type,
        'customer': project.customer or None,
        'status': _project_status(project),
        'rag': project.rag or None,
        'start_date': project.expected_start_date,
        'due_date': project.expected_end_date,
        'project_manager': _user_display(project.project_lead),
        'relations_manager': _user_display(project.relations_manager),
        'budget_hours': project.expected_time,
        'consumed_time': project.actual_time,
        'progress_in_hours': project.progress_in_hours,
        'actual_progress': actual_progress,
        'estimated_costing': project.estimated_costing,
        'total_sales_amount': project.total_sales_amount,
        'total_costing': project.total_costing_amount,
        'total_billable_amount': project.total_billable_amount,
        'total_billed_amount': project.total_billed_amount,
        'gross_margin': project.gross_margin,
        'per_gross_margin': project.per_gross_margin,
        'team_members': team_members,
        'subtasks': subtasks,
    }


@extend_schema(
    tags=['PMO Dashboard'],
    summary='List all projects',
    description='Returns all projects with the fields required by the PMO dashboard, including team members and subtasks.',
    responses={
        200: OpenApiResponse(
            description='List of projects',
            response={
                'type': 'array',
                'items': {
                    'type': 'object',
                    'properties': {
                        'id': {'type': 'integer'},
                        'name': {'type': 'string'},
                        'business_unit': {'type': 'string', 'nullable': True},
                        'project_type': {'type': 'string'},
                        'customer': {'type': 'string', 'nullable': True},
                        'status': {'type': 'string', 'enum': ['on_track', 'delayed', 'at_risk', 'completed']},
                        'rag': {'type': 'string', 'nullable': True},
                        'start_date': {'type': 'string', 'format': 'date', 'nullable': True},
                        'due_date': {'type': 'string', 'format': 'date', 'nullable': True},
                        'project_manager': {'type': 'string', 'nullable': True},
                        'relations_manager': {'type': 'string', 'nullable': True},
                        'budget_hours': {'type': 'number', 'nullable': True},
                        'consumed_time': {'type': 'number', 'nullable': True},
                        'progress_in_hours': {'type': 'number', 'nullable': True},
                        'actual_progress': {'type': 'number', 'nullable': True, 'description': '0–1 scale (percent_complete / 100)'},
                        'estimated_costing': {'type': 'number', 'nullable': True},
                        'total_sales_amount': {'type': 'number', 'nullable': True},
                        'total_costing': {'type': 'number', 'nullable': True},
                        'total_billable_amount': {'type': 'number', 'nullable': True},
                        'total_billed_amount': {'type': 'number', 'nullable': True},
                        'gross_margin': {'type': 'number', 'nullable': True},
                        'per_gross_margin': {'type': 'number', 'nullable': True},
                        'team_members': {
                            'type': 'array',
                            'items': {
                                'type': 'object',
                                'properties': {
                                    'id': {'type': 'integer'},
                                    'name': {'type': 'string'},
                                    'role': {'type': 'string'},
                                    'is_lead': {'type': 'boolean'},
                                },
                            },
                        },
                        'subtasks': {
                            'type': 'array',
                            'items': {
                                'type': 'object',
                                'properties': {
                                    'id': {'type': 'integer'},
                                    'name': {'type': 'string'},
                                    'budget_time': {'type': 'number'},
                                    'consumed_time': {'type': 'number'},
                                },
                            },
                        },
                    },
                },
            },
        )
    },
)
class ProjectListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        projects = (
            Project.objects
            .select_related('business_unit', 'project_lead', 'relations_manager')
            .prefetch_related('members__user', 'task_set')
            .order_by('name')
        )
        return Response([_serialize_project(p) for p in projects])
