from drf_spectacular.utils import extend_schema
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from pmo_dashboard.access import can_access_pmo
from pmo_dashboard.serializers.project import ProjectSerializer
from timesheet.models.project import Project


class IsPMOMemberOrSuperuser(BasePermission):
    def has_permission(self, request, view):
        return can_access_pmo(request.user)


@extend_schema(
    tags=['PMO Dashboard'],
    summary='List all projects',
    description='Returns all projects with the fields required by the PMO dashboard, including team members and subtasks.',
    responses={200: ProjectSerializer(many=True)},
)
class ProjectListView(APIView):
    permission_classes = [IsAuthenticated, IsPMOMemberOrSuperuser]

    def get(self, request):
        projects = (
            Project.objects
            .select_related('business_unit', 'project_lead', 'relations_manager')
            .prefetch_related('members__user', 'task_set')
            .order_by('name')
        )
        return Response(ProjectSerializer(projects, many=True).data)
