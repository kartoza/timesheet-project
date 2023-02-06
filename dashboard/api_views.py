from django.http import Http404
from rest_framework.views import APIView, Response
from django.contrib.auth.mixins import LoginRequiredMixin
from timesheet.utils.erp import get_burndown_chart_data
from timesheet.models.project import Project
from timesheet.models.summary import SavedSummary


class BurnDownChartData(LoginRequiredMixin, APIView):

    def get(self, request, *args, **kwargs):
        project_name = request.GET.get('project')
        return Response(get_burndown_chart_data(project_name))


class ListSummary(LoginRequiredMixin, APIView):

    def get(self, request, *args, **kwargs):
        summaries = SavedSummary.objects.all()
        summaries_data = []
        for summary in summaries:
            summaries_data.append({
                'name': summary.name,
                'slug_name': summary.slug_name,
                'view_count': summary.view_count,
                'project_name': summary.project.name
            })
        return Response(summaries_data)


class PublicBurnDownChartData(APIView):

    authentication_classes = []
    permission_classes = []

    def get(self, request, *args, **kwargs):
        project_id = request.GET.get('id')
        project = Project.objects.get(
            id=project_id
        )
        if not SavedSummary.objects.filter(
            project=project
        ).exists():
            raise Http404()
        return Response(get_burndown_chart_data(project.name))
