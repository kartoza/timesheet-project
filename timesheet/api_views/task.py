from django.db.models import F
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response

from timesheet.models import Task, Project


class TaskAutocomplete(APIView):

    queryset = Task.objects.all()

    def get(self, request, task_id):
        project = get_object_or_404(
            Project,
            id=task_id
        )
        query = request.GET.get('q', '')

        self.queryset = self.queryset.filter(
            project=project,
            name__icontains=query
        )

        return Response(
            self.queryset.annotate(label=F('name')).values(
                'id', 'label'
            )
        )
