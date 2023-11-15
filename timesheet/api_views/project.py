import ast
from django.db.models import F
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response

from timesheet.models import Project
from timesheet.utils.erp import (
    pull_projects_from_erp,
    pull_user_data_from_erp
)
from schedule.models.user_project_slot import (
    UserProjectSlot
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
