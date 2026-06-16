import logging
import time

from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from pmo_dashboard.access import can_access_pmo
from pmo_dashboard.serializers.project import ProjectSerializer
from timesheet.models.project import Project
from timesheet.utils.erp import pull_project_members_from_erp, pull_projects_only_from_erp, pull_tasks_from_erp

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
        pull_projects_only_from_erp(request.user, filters='[["status", "=", "Open"]]')
        t1 = time.perf_counter()
        logger.warning('pull_projects_only_from_erp took %.2fs', t1 - t0)

        projects = (
            Project.objects.filter(is_active=True)
            .select_related('business_unit', 'project_lead', 'relations_manager')
            .prefetch_related('members__user', 'task_set')
            .order_by('name')
        )

        t2 = time.perf_counter()
        logger.warning('ProjectListView total (sync + query) took %.2fs', t2 - t0)

        return Response(ProjectSerializer(projects, many=True).data)


@extend_schema(
    tags=['PMO Dashboard'],
    summary='Get project detail',
    description='Syncs and returns a single project with fresh members and tasks from ERPNext.',
    responses={200: ProjectSerializer()},
)
class ProjectDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPMOMemberOrSuperuser]

    def get(self, request, pk):
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        t0 = time.perf_counter()
        name = project.name
        updated_projects = [project]

        pull_tasks_from_erp(
            request.user,
            updated_projects,
            filters=f'[["project", "=", "{name}"]]',
        )
        t1 = time.perf_counter()
        logger.warning('ProjectDetailView pull_tasks_from_erp took %.2fs', t1 - t0)

        pull_project_members_from_erp(request.user, project_name=name)
        t2 = time.perf_counter()
        logger.warning('ProjectDetailView pull_project_members_from_erp took %.2fs', t2 - t1)

        project = (
            Project.objects.select_related('business_unit', 'project_lead', 'relations_manager')
            .prefetch_related('members__user', 'task_set')
            .get(pk=pk)
        )
        logger.warning('ProjectDetailView total took %.2fs', time.perf_counter() - t0)
        return Response(ProjectSerializer(project).data)
