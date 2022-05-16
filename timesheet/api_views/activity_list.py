from rest_framework.views import APIView
from rest_framework.response import Response

from timesheet.models import Activity


class ActivityList(APIView):

    queryset = Activity.objects.all()

    def get(self, request, format=None):
        return Response(
            self.queryset.values_list('name', flat=True))
