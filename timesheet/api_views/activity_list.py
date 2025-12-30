from django.db.models import F
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse

from timesheet.models import Activity


@extend_schema(
    tags=['Timesheet'],
    summary="List all activities",
    description="Retrieves a list of all available activities for timesheet entries.",
    responses={
        200: OpenApiResponse(
            description="List of activities",
            response={
                'type': 'array',
                'items': {
                    'type': 'object',
                    'properties': {
                        'id': {'type': 'integer', 'description': 'Activity ID'},
                        'label': {'type': 'string', 'description': 'Activity name'}
                    }
                }
            }
        )
    }
)
class ActivityList(APIView):

    queryset = Activity.objects.all()

    def get(self, request, format=None):
        return Response(
            self.queryset.annotate(label=F('name')).values(
                'id', 'label'
            )
        )
