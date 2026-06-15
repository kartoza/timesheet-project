import logging
import time

from drf_spectacular.utils import extend_schema
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from pmo_dashboard.access import can_access_pmo
from pmo_dashboard.serializers.project import ProjectSerializer
from timesheet.models.project import Project
from timesheet.utils.erp import pull_projects_from_erp

logger = logging.getLogger(__name__)


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
        t0 = time.perf_counter()
        pull_projects_from_erp(request.user, filters='[["status", "=", "Open"]]')
        t1 = time.perf_counter()
        logger.warning('pull_projects_from_erp took %.2fs', t1 - t0)

        projects = (
            Project.objects.filter(is_active=True)
            .select_related('business_unit', 'project_lead', 'relations_manager')
            .prefetch_related('members__user', 'task_set')
            .order_by('name')
        )

        t2 = time.perf_counter()
        logger.warning('ProjectListView total (sync + query) took %.2fs', t2 - t0)

        return Response(ProjectSerializer(projects, many=True).data)
