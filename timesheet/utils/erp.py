import json
from datetime import datetime
from collections import OrderedDict
import requests
from preferences import preferences
import logging
import calendar
from django.conf import settings
from django.db.models import Sum

from django.utils import timezone
from django.contrib.auth import get_user_model

from timesheet.enums.doctype import DocType
from timesheet.models import Timelog, Project, Task, Activity
from timesheet.models.user_project import UserProject
from timesheet.serializers.timesheet import TimelogSerializerERP

logger = logging.getLogger(__name__)


class ProjectsNotFound(Exception):
    "Raised when projects are not found in erpnext"
    pass


def get_erp_data(doctype: DocType, erpnext_token: str = None, filters: str = '') -> list:
    url = (
        f'{settings.ERPNEXT_SITE_LOCATION}/api/'
        f'resource/{doctype.value}/?limit_page_length=None&fields=["*"]'
    )
    if filters:
        url += '&filters=' + filters
    if not erpnext_token:
        erpnext_token = settings.ERPNEXT_TOKEN
    headers = {
        'Authorization': 'token {}'.format(erpnext_token)
    }
    response = requests.request(
        'GET',
        url,
        headers=headers
    )
    if not response.status_code == 200:
        logger.error(response.content)
        return []

    response_data = response.json()
    if 'data' not in response_data:
        logger.error('Data not found')
        return []
    return response_data['data']


def generate_api_secret(user: get_user_model()):
    url = (
        f'{settings.ERPNEXT_SITE_LOCATION}/api/'
        f'method/frappe.core.doctype.user.user.generate_keys?user='
    )
    token = preferences.TimesheetPreferences.admin_token
    headers = {
        'Authorization': 'token {}'.format(token)
    }
    response = requests.post(
        url + user.email,
        headers=headers
    )
    if response.status_code == 200:
        response_data = response.json()
        if 'message' in response_data:
            user.profile.api_secret = response_data['message']['api_secret']
            user.profile.save()


def pull_user_data_from_erp(user: get_user_model()):

    users = get_erp_data(
        DocType.USER, preferences.TimesheetPreferences.admin_token, 
        f'[["email", "=", "{user.email}"]]'
    )
    if len(users) > 0:
        erp_user = users[0]
        user.profile.api_key = erp_user['api_key']
        user.profile.save()

    if not user.profile.api_secret:
        generate_api_secret(user)
    
    employee = get_erp_data(
        DocType.EMPLOYEE, user.profile.token, 
        f'[["company_email", "=", "{user.email}"]]'
    )
    if len(employee) > 0:
        employee_data = employee[0]
        user.profile.employee_name = employee_data['employee_name']
        user.profile.employee_id = employee_data['employee']
        user.profile.save()

        user.first_name = employee_data['first_name']
        user.last_name = employee_data['last_name']
        user.save()


def pull_projects_from_erp(user: get_user_model()):
    projects = get_erp_data(
        DocType.PROJECT, user.profile.token)

    if len(projects) == 0:
        raise ProjectsNotFound

    updated = timezone.now()
    for project in projects:
        _project, _ = Project.objects.update_or_create(
            name=project['name'],
            defaults={
                'is_active': project['is_active'] == 'Yes',
                'updated': updated
            }
        )
        UserProject.objects.get_or_create(
            user=user,
            project=_project
        )
    
    # Check inactive projects
    inactive = UserProject.objects.exclude(
        project__updated=updated
    )
    if inactive.exists():
        inactive_projects = Project.objects.filter(
            id__in=inactive.values('project')
        ).distinct()
        inactive_projects.update(is_active=False)
        Project.objects.filter(
            id__in=inactive_projects.values('id')
        ).delete()


    tasks = get_erp_data(
        DocType.TASK, user.profile.token
    )
    updated_tasks = []
    for task in tasks:
        try:
            project = Project.objects.get(name=task['project'])
        except Project.DoesNotExist:
            continue
        try:
            task, _ = Task.objects.update_or_create(
                project=project,
                name=task['subject'],
                erp_id=task['name'],
                defaults={
                    "expected_time": task['expected_time'],
                    "actual_time": task['actual_time']
                }
            )
            updated_tasks.append(task.id)
        except Task.MultipleObjectsReturned:
            tasks = Task.objects.filter(
                project=project,
                name=task['subject'],
                erp_id=task['name'],
            ).order_by('-id')
            latest_task = tasks.first()
            tasks.exclude(id=latest_task.id).delete()
            tasks.update(
                expected_time=task['expected_time'],
                actual_time=task['actual_time']
            )
            updated_tasks.append(latest_task.id)
        # deleted_tasks = Task.objects.filter(
        #     project=project
        # ).exclude(
        #     id__in=updated_tasks
        # )
        # if deleted_tasks.exists():
        #     deleted_tasks.delete()

    activities = get_erp_data(
        DocType.ACTIVITY, user.profile.token)

    for activity in activities:
        if 'name' not in activity:
            continue
        Activity.objects.get_or_create(
            name=activity['name']
        )


def push_timesheet_to_erp(queryset: Timelog.objects, user: get_user_model()):
    serializer = TimelogSerializerERP(
        queryset.order_by('start_time'), many=True)

    datetime_format = '%Y-%m-%d %H:%M:%S'
    timelogs = {}

    for serializer_data in serializer.data:
        from_time = datetime.strptime(serializer_data['from_time'], datetime_format)
        to_time = datetime.strptime(serializer_data['to_time'], datetime_format)
        project_name = serializer_data['project_name']
        if project_name not in timelogs:
            timelogs[project_name] = {
                'owner': serializer_data['owner_name'],
                'employee_name': serializer_data['employee_name'],
                'employee': serializer_data['employee'],
                'from_time': from_time,
                'to_time': to_time,
                'data': [serializer_data],
                'ids': [serializer_data.get('id')]
            }
        else:
            if from_time < timelogs[project_name]['from_time']:
                timelogs[project_name]['from_time'] = from_time
            if to_time > timelogs[project_name]['to_time']:
                timelogs[project_name]['to_time'] = to_time
            timelogs[serializer_data['project_name']]['data'].append(
                serializer_data
            )
            timelogs[serializer_data['project_name']]['ids'].append(
                serializer_data.get('id')
            )

    url = f'{settings.ERPNEXT_SITE_LOCATION}/api/resource/Timesheet'
    headers = {
        'Authorization': 'token {}'.format(user.profile.token)
    }
    logger.error(headers)

    submitted_timelogs = []
    for key, value in timelogs.items():
        erp_timesheet_data = {
            'employee_name': value['employee_name'],
            'employee': value['employee'],
            'title': (
                f'{value["owner"]} : '
                f'{value["from_time"].strftime("%d/%m/%y")}-'
                f'{value["to_time"].strftime("%d/%m/%y")} - {key}'
            ),
            'time_logs': value["data"]
        }
        submitted_timelogs.append(value["data"])

        logger.error(erp_timesheet_data)
        response = requests.post(
            url,
            data=json.dumps(erp_timesheet_data),
            headers=headers
        )
        if response.status_code == 200:
            logger.info('Timesheet submitted successfully')
            
            timelogs = Timelog.objects.filter(
                id__in=value['ids']
            ).update(submitted=True)

        else:
            logger.error(response.text)


def get_report_data(report_name: str, erpnext_token: str = None, filters: str = '') -> list:
    url = (
        f'{settings.ERPNEXT_SITE_LOCATION}/api/'
        f'method/frappe.desk.query_report.run?report_name={report_name}'
    )
    if filters:
        url += '&filters=' + filters
    if not erpnext_token:
        erpnext_token = settings.ERPNEXT_TOKEN
    headers = {
        'Authorization': 'token {}'.format(erpnext_token)
    }
    response = requests.request(
        'GET',
        url,
        headers=headers
    )
    if not response.status_code == 200:
        logger.error(response.content)
        return []

    response_data = response.json()
    if 'message' not in response_data:
        logger.error('Data not found')
        return []
    message = response_data['message']
    if 'result' not in message:
        logger.error('Data not found')
        return []
    return message['result']


def get_detailed_report_data(project_name: str, filters: str = ''):
    if not filters:
        filters = f'{{"Project":"{project_name}"}}'
    timesheet_detail = get_report_data(
        'Timesheet%20Detailed%20Report',
        preferences.TimesheetPreferences.admin_token,
        filters)
    return timesheet_detail


def get_burndown_chart_data(project_name: str):
    
    def week_of_month(dt):
        """ Returns the week of the month for the specified date.
        """
        if dt.month == 1:
            return dt.isocalendar()[1] + 1
        return (dt.isocalendar()[1] - dt.replace(day=1).isocalendar()[1] + 1)

    total_expected_time = 0
    project = Project.objects.filter(
        name=project_name
    ).first()
    if project:
        total_expected_time = Task.objects.filter(
            project=project
        ).aggregate(
            total_hours=Sum('expected_time'),
            total_actual_hours=Sum('actual_time')
        )
    timesheet_detail = get_detailed_report_data(project_name)
    
    hours_by_week = {}
    for timesheet_date in timesheet_detail:
        if 'Date' not in timesheet_date:
            continue
        date_time_obj = datetime.strptime(timesheet_date['Date'], '%Y-%m-%d')
        week_number = week_of_month(date_time_obj)
        week = f'{date_time_obj.isocalendar()[0]}{str(date_time_obj.isocalendar()[1]).zfill(2) }'
        if week not in hours_by_week:
            hours_by_week[week] = {
                'hours': timesheet_date['Hours'],
                'week_string' : (
                    f'{calendar.month_abbr[date_time_obj.month]} '
                    f'Week {week_number}'
                )
            }
        else:
            hours_by_week[week]['hours'] += timesheet_date['Hours']

    return {
        'hours': OrderedDict(sorted(hours_by_week.items())),
        'total_hours': total_expected_time,
        'project': project.name if project else '-'
    }


def pull_leave_data_from_erp(user):
    """
    Retrieves leave days data from ERPNext and generates a leave schedule.
    """
    from schedule.models.schedule import Schedule
    filters = []
    if user.profile.employee_id:
        filters.append(["employee", "=", user.profile.employee_id])
    else:
        filters.append(
            ["employee_name", "=", f"{user.first_name} {user.last_name}"])
    filters.append(["status", "=", "Approved"])
    leave_data = get_erp_data(
        DocType.LEAVE, preferences.TimesheetPreferences.admin_token,
        str(filters).replace('\'', '"')
    )
    leave_type = {
        'Paid Annual leave': 'Leave - Paid',
        'Paid Sick Leave': 'Leave - Sick',
        'Leave in lieu of time worked': 'Time in lieu'
    }
    for leave in leave_data:
        if leave['leave_type'] in leave_type:
            activity, _ = Activity.objects.get_or_create(
                name=leave_type[leave['leave_type']]
            )
        else:
            if 'unpaid' in leave['leave_type'].lower():
                activity, _ = Activity.objects.get_or_create(
                    name='Leave - Unpaid'
                )
            elif 'family' in leave['leave_type'].lower():
                activity, _ = Activity.objects.get_or_create(
                    name='Leave - Paid Family Responsibility'
                )
            else:
                activity, _ = Activity.objects.get_or_create(
                    name=leave['leave_type']
                )
        Schedule.objects.update_or_create(
            erp_id=leave['name'],
            defaults={
                'user': user,
                'activity': activity,
                'start_time': leave['from_date'],
                'end_time': leave['to_date'],
                'notes': leave['description']
            }
        )
