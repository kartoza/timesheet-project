from django.db.models import F
from rest_framework.views import APIView
from rest_framework.response import Response

from timesheet.models import Project


class ProjectAutocomplete(APIView):

    queryset = Project.objects.all()

    def get(self, request, format=None):
        query = request.GET.get('q', '')

        if not query or len(query) < 2:
            return Response([])

        self.queryset = self.queryset.filter(
            name__icontains=query
        )

        return Response(
            self.queryset.annotate(label=F('name')).values(
                'id', 'label'
            )
        )
