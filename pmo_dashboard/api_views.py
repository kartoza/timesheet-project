import logging
import time

from django.utils import timezone
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

def _project_qs():
    return (
        Project.objects
        .filter(is_active=True)
        .select_related('business_unit', 'project_lead', 'relations_manager')
        .prefetch_related('members__user', 'task_set')
        .order_by('name')
    )


def _single_project_qs(pk):
    return (
        Project.objects
        .select_related('business_unit', 'project_lead', 'relations_manager')
        .prefetch_related('members__user', 'task_set')
        .get(pk=pk)
    )


class IsPMOMemberOrSuperuser(BasePermission):
    def has_permission(self, request, view):
        return can_access_pmo(request.user)


@extend_schema(
    tags=['PMO Dashboard'],
    summary='List all projects',
    description='Returns cached projects from the database. Use POST /api/pmo/projects/sync/ to refresh from ERPNext.',
    responses={200: ProjectSerializer(many=True)},
)
class ProjectListView(APIView):
    permission_classes = [IsAuthenticated, IsPMOMemberOrSuperuser]

    def get(self, request):
        projects = _project_qs()
        return Response(ProjectSerializer(projects, many=True).data)


@extend_schema(
    tags=['PMO Dashboard'],
    summary='Sync all projects from ERPNext',
    description='Pulls all open projects from ERPNext, deactivates stale ones, and returns the updated list.',
    responses={200: ProjectSerializer(many=True)},
)
class ProjectSyncView(APIView):
    permission_classes = [IsAuthenticated, IsPMOMemberOrSuperuser]

    def post(self, request):
        t0 = time.perf_counter()
        try:
            updated_projects = pull_projects_only_from_erp(
                None,
                filters='[["status", "=", "Open"]]',
            )
            Project.objects.filter(is_active=True).exclude(id__in=updated_projects).update(is_active=False)
            Project.objects.filter(id__in=updated_projects).update(last_synced_at=timezone.now())
        except Exception:
            logger.warning('ProjectSyncView: ERP sync failed')
            return Response({'detail': 'ERP sync failed.'}, status=status.HTTP_502_BAD_GATEWAY)

        logger.warning('ProjectSyncView took %.2fs', time.perf_counter() - t0)
        return Response(ProjectSerializer(_project_qs(), many=True).data)


@extend_schema(
    tags=['PMO Dashboard'],
    summary='Get project detail',
    description='Returns a single project from the database. Use POST /api/pmo/projects/<pk>/sync/ to refresh from ERPNext.',
    responses={200: ProjectSerializer()},
)
class ProjectDetailView(APIView):
    permission_classes = [IsAuthenticated, IsPMOMemberOrSuperuser]

    def get(self, request, pk):
        try:
            project = _single_project_qs(pk)
        except Project.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(ProjectSerializer(project).data)


@extend_schema(
    tags=['PMO Dashboard'],
    summary='Sync single project from ERPNext',
    description='Pulls fresh tasks and team members for one project from ERPNext, then returns the updated project.',
    responses={200: ProjectSerializer()},
)
class ProjectDetailSyncView(APIView):
    permission_classes = [IsAuthenticated, IsPMOMemberOrSuperuser]

    def post(self, request, pk):
        try:
            project = Project.objects.get(pk=pk)
        except Project.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        t0 = time.perf_counter()
        name = project.name

        pull_tasks_from_erp(None, [project], filters=f'[["project", "=", "{name}"]]')
        t1 = time.perf_counter()
        logger.warning('ProjectDetailSyncView pull_tasks_from_erp took %.2fs', t1 - t0)

        pull_project_members_from_erp(None, project_name=name)
        t2 = time.perf_counter()
        logger.warning('ProjectDetailSyncView pull_project_members_from_erp took %.2fs', t2 - t1)

        Project.objects.filter(pk=pk).update(last_synced_at=timezone.now())
        logger.warning('ProjectDetailSyncView total took %.2fs', time.perf_counter() - t0)

        return Response(ProjectSerializer(_single_project_qs(pk)).data)
