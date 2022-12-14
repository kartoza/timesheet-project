import json
from datetime import datetime
import requests
import logging
from django.conf import settings

from django.utils import timezone
from django.contrib.auth import get_user_model

from timesheet.enums.doctype import DocType
from timesheet.models import Timelog, Project, Task, Activity
from timesheet.models.user_project import UserProject
from timesheet.serializers.timesheet import TimelogSerializerERP

logger = logging.getLogger(__name__)


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


def pull_user_data_from_erp(user: get_user_model()):
    users = get_erp_data(
        DocType.EMPLOYEE, user.profile.token, f'[["company_email", "=", "{user.email}"]]'
    )
    if len(users) > 0:
        erp_user = users[0]
        user.profile.employee_name = erp_user['employee_name']
        user.profile.employee_id = erp_user['employee']
        user.profile.save()

        user.first_name = erp_user['first_name']
        user.last_name = erp_user['last_name']
        user.save()


def pull_projects_from_erp(user: get_user_model()):
    projects = get_erp_data(
        DocType.PROJECT, user.profile.token)
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
            id__in=inactive_projects.exclude(
                task__timelog__isnull=False
            ).values('id')
        ).delete()


    tasks = get_erp_data(
        DocType.TASK, user.profile.token
    )
    for task in tasks:
        try:
            project = Project.objects.get(name=task['project'])
        except Project.DoesNotExist:
            continue
        try:
            Task.objects.update_or_create(
                project=project,
                name=task['subject'],
                erp_id=task['name'],
                defaults={
                    "expected_time": task['expected_time'],
                    "actual_time": task['actual_time']
                }
            )
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
