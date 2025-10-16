import ast

from django.contrib.auth.mixins import UserPassesTestMixin
from django.contrib.auth.models import User
from django.db.models import F, Value as V
from django.contrib.auth import get_user_model
from django.db.models.functions import Concat
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response

from timesheet.models import Project
from timesheet.serializers.timesheet import ProjectLinkSerializer
from timesheet.utils.erp import (
    pull_projects_from_erp,
    pull_user_data_from_erp
)
from schedule.models.user_project_slot import (
    UserProjectSlot
)
from timesheet.models.project import ProjectLink


class PullProjects(APIView):

    def post(self, request, *args):
        if 'None' in request.user.profile.token:
            pull_user_data_from_erp(request.user)
        pull_projects_from_erp(request.user)

        return Response({'success': True})


class ProjectLinkListApiView(APIView):
    def get(self, request, *args):
        project = get_object_or_404(
            Project,
            id=request.GET.get('id', None)
        )
        project_links = ProjectLink.objects.filter(
            project=project)
        serializer = ProjectLinkSerializer(
            project_links, many=True)
        return Response(serializer.data)


class ProjectLinkApiView(UserPassesTestMixin, APIView):
    def test_func(self):
        return self.request.user.is_staff

    def post(self, request, *args, **kwargs):
        data = request.data

        if 'id' in data and data['id']:
            project_link = get_object_or_404(ProjectLink, id=data.get('id'))
            serializer = ProjectLinkSerializer(
                project_link, data=data, partial=True)
        else:
            serializer = ProjectLinkSerializer(data=data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, *args, **kwargs):
        data = request.data
        project_link = get_object_or_404(
            ProjectLink, id=data.get('id')
        )
        project_link.delete()
        return Response(status=204)


class UserAutocomplete(APIView):
    queryset = User.objects.exclude(profile__employee_id='')
    def get(self, request, format=None):
        query = request.GET.get('q', '')
        self.queryset = self.queryset.filter(
            first_name__icontains=query
        )
        return Response(
            self.queryset.annotate(label=Concat('first_name', V(' '), 'last_name')).values(
                'id', 'label'
            ).distinct()
        )


class ProjectAutocomplete(APIView):

    queryset = Project.objects.filter(is_active=True)

    def get(self, request, format=None):
        query = request.GET.get('q', '')
        user_id = request.GET.get('user_id', None)
        try:
            ignore_user = ast.literal_eval(
                request.GET.get('ignoreUser', 'False')
            )
        except ValueError:
            ignore_user = False

        if not query or len(query) < 1:
            return Response([])

        self.queryset = self.queryset.filter(
            name__icontains=query
        )

        if not ignore_user:
            if user_id:
                user = get_user_model().objects.get(id=user_id)
            else:
                user = self.request.user
            self.queryset = self.queryset.filter(
                userproject__user=user,
            )
            if user_id:
                user_project_slots = UserProjectSlot.objects.filter(
                    user=user,
                    active=True
                )
                self.queryset = self.queryset.exclude(
                    id__in=list(
                        user_project_slots.values_list(
                            'project_id', flat=True))
                )

        return Response(
            self.queryset.annotate(label=F('name')).values(
                'id', 'label'
            ).distinct()
        )
