import csv
from datetime import datetime

from django.http import Http404, HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView, Response
from django.contrib.auth.mixins import LoginRequiredMixin, UserPassesTestMixin
from timesheet.utils.erp import get_burndown_chart_data, get_detailed_report_data
from timesheet.models.project import Project
from timesheet.models.summary import SavedSummary
from timesheet.models.task import Task


REPORT_TASK = 'Task'
REPORT_USER = 'Employee Name'
REPORT_BILL = 'Billable Hours'
REPORT_HOURS = 'Hours'


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


class ReportData(UserPassesTestMixin, APIView):
    def test_func(self):
        return self.request.user.is_staff

    def task_based_analysis(self, report_data):
        tasks = {}
        for report in report_data:
            if not report[REPORT_TASK]:
                continue
            task = Task.objects.filter(
                erp_id=report[REPORT_TASK]
            )
            if task.exists():
                task = task.first().name
            else:
                task = report[REPORT_TASK]

            if task not in tasks:
                tasks[task] = {}
            if report[REPORT_USER] not in tasks[task]:
                tasks[task][report[REPORT_USER]] = report[REPORT_HOURS]
            else:
                tasks[task][report[REPORT_USER]] += report[REPORT_HOURS]
        return tasks

    def user_based_analysis(self, report_data):
        utilization_rate = {}
        total_billable_hours = {}
        total_hours = {}
        total_costing = {}
        total_billing = {}
        average_cost_per_hour = {}
        billing_efficiency = {}
        employee_contributions = {}
        total_billing_all = sum(item["Total Billing"] for item in report_data)

        for report in report_data:
            user = report[REPORT_USER]
            employee_billing = report['Total Billing']
            employee_costing = report['Total Costing']
            contribution_percentage = (employee_billing / total_billing_all) * 100

            total_billable_hours[user] = total_billable_hours.get(user, 0) + report[REPORT_BILL]
            total_hours[user] = total_hours.get(user, 0) + report[REPORT_HOURS]
            total_costing[user] = total_costing.get(user, 0) + employee_costing
            total_billing[user] = total_billing.get(user, 0) + employee_billing
            employee_contributions[user] = (
                employee_contributions.get(user, 0) + contribution_percentage
            )

        for attr, value in total_hours.items():
            utilization_rate[attr] = (
                total_billable_hours[attr] /
                value
            ) * 100
            average_cost_per_hour[attr] = (
                total_costing[attr] /
                value
            ) if total_costing[attr] > 0 else 0
            billing_efficiency[attr] = (
                total_billing[attr] /
                total_costing[attr]
            ) * 100 if total_costing[attr] > 0 else 0

        sorted_employee_contributions = (
            sorted(employee_contributions.items(),
                   key=lambda x: x[1],
                   reverse=True)
        )

        employee_contributions = dict(
            sorted_employee_contributions
        )

        return {
            'total_billable_hours': total_billable_hours,
            'total_hours': total_hours,
            'utilization_rate': utilization_rate,
            'average_cost_per_hour': average_cost_per_hour,
            'billing_efficiency': billing_efficiency,
            'employee_contributions': employee_contributions
        }

    def get(self, request, *args, **kwargs):
        project = get_object_or_404(
            Project,
            id=request.GET.get('id', None)
        )
        detailed_report = get_detailed_report_data(project.name)
        if len(detailed_report) == 0:
            raise Http404()
        detailed_report = detailed_report[:-1]
        analysis = {
            'task_based_analysis': self.task_based_analysis(detailed_report),
            'user_based_analysis': self.user_based_analysis(detailed_report)
        }

        return Response(analysis)
