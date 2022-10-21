import re

from django.db.models import F, CharField, Value
from django.db.models.functions import Concat, Round
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

        tasks = self.queryset.annotate(
            label=Concat('name',
                         Value(' ('),
                         Round(F('actual_time'), 2),
                         Value('/'),
                         Round(F('expected_time'), 2),
                         Value(')'), output_field=CharField())
        ).values(
            'id', 'label'
        )

        for task in tasks:
            task['label'] = re.sub(' +', ' ', task['label'])

        return Response(
            tasks
        )
