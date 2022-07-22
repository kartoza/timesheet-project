import json

from datetime import datetime
import requests
import logging
from django.conf import settings
from django.contrib.auth import get_user_model

from timesheet.enums.doctype import DocType
from timesheet.models import Timelog
from timesheet.serializers.timesheet import TimelogSerializer

logger = logging.getLogger(__name__)


def get_erp_data(doctype: DocType, erpnext_token: str = None) -> list:
    url = (
        f'{settings.ERPNEXT_SITE_LOCATION}/api/'
        f'resource/{doctype.value}/?limit_page_length=None&fields=["*"]'
    )
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


def push_timesheet_to_erp(queryset: Timelog.objects, user: get_user_model()):
    serializer = TimelogSerializer(
        queryset.order_by('start_time'), many=True)

    datetime_format = '%Y-%m-%d %H:%M'
    timelogs = {}

    for serializer_data in serializer.data:
        from_time = datetime.strptime(serializer_data['from_time'], datetime_format)
        to_time = datetime.strptime(serializer_data['to_time'], datetime_format)
        project_name = serializer_data['project_name']
        if project_name not in timelogs:
            timelogs[project_name] = {
                'owner': serializer_data['owner_name'],
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

    submitted_timelogs = []
    for key, value in timelogs.items():
        erp_timesheet_data = {
            'title': (
                f'{value["owner"]} : '
                f'{value["from_time"].strftime("%d/%m/%y")}-'
                f'{value["to_time"].strftime("%d/%m/%y")} - {key}'
            ),
            'time_logs': value["data"]
        }
        submitted_timelogs.append(value["data"])
        response = requests.post(
            url,
            data=json.dumps(erp_timesheet_data),
            headers=headers
        )

        if response.status_code == 200:
            logger.info('Timesheet submitted successfully')
            Timelog.objects.filter(
                id__in=value['ids']
            ).update(submitted=True)
        else:
            logger.error(response)
