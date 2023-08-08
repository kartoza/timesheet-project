import csv
from datetime import datetime

from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView, Response
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from timesheet.utils.erp import get_burndown_chart_data, get_detailed_report_data
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


class DownloadReportData(UserPassesTestMixin, APIView):
    def test_func(self):
        return self.request.user.is_staff

    def get(self, request, *args, **kwargs):
        project = get_object_or_404(
            Project,
            id=request.GET.get('id', None)
        )
        detailed_report = get_detailed_report_data(project.name)
        if len(detailed_report) == 0:
            raise Http404()
        detailed_report = detailed_report[:-1]
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="Detailed Report {}.csv"'.format(
            project.name
        )
        data_sorted = sorted(
            detailed_report,
            key=lambda x: datetime.strptime(x["Date"], '%Y-%m-%d'))

        writer = csv.DictWriter(response, fieldnames=detailed_report[0].keys())
        writer.writeheader()
        for row in data_sorted:
            try:
                writer.writerow(row)
            except AttributeError:
                continue

        return response
