import ast
from django.db.models import F
from django.http import Http404
from rest_framework.views import APIView
from rest_framework.response import Response

from timesheet.models import Project
from timesheet.utils.erp import (
    pull_projects_from_erp,
    pull_user_data_from_erp
)


class PullProjects(APIView):

    def post(self, request, *args):
        if 'None' in request.user.profile.token:
            pull_user_data_from_erp(request.user)
        pull_projects_from_erp(request.user)

        return Response({'success': True})


class ProjectAutocomplete(APIView):

    queryset = Project.objects.filter(is_active=True)

    def get(self, request, format=None):
        query = request.GET.get('q', '')
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
            self.queryset = self.queryset.filter(
                userproject__user=self.request.user,
            )

        return Response(
            self.queryset.annotate(label=F('name')).values(
                'id', 'label'
            )
        )
