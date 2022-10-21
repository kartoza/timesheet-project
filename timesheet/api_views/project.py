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
        if not request.user.profile.token:
            raise Http404()
        pull_projects_from_erp(request.user)
        pull_user_data_from_erp(request.user)

        return Response({'success': True})


class ProjectAutocomplete(APIView):

    queryset = Project.objects.all()

    def get(self, request, format=None):
        query = request.GET.get('q', '')

        if not query or len(query) < 1:
            return Response([])

        self.queryset = self.queryset.filter(
            userproject__user=self.request.user,
            name__icontains=query
        )

        return Response(
            self.queryset.annotate(label=F('name')).values(
                'id', 'label'
            )
        )
