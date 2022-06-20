import json

import requests
import logging
from django.conf import settings

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


def push_timesheet_to_erp(queryset: Timelog.objects):
    serializer = TimelogSerializer(queryset, many=True)
    timesheet_data = {
        'title': 'Dimas Test',
        'time_logs': serializer.data
    }

    url = f'{settings.ERPNEXT_SITE_LOCATION}/api/resource/Timesheet'
    headers = {
        'Authorization': 'token {}'.format(settings.ERPNEXT_TOKEN)
    }
    response = requests.post(
        url,
        data=json.dumps(timesheet_data),
        headers=headers
    )

    if response.status_code == 200:
        logger.info('Timesheet submitted successfully')
        queryset.update(submitted=True)
    else:
        logger.error(response)
