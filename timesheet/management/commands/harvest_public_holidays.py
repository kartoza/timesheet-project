import logging
from django.core.management.base import BaseCommand
from timesheet.models.activity import Activity
from timesheet.utils.erp import get_erp_data, pull_holiday_list
from timesheet.enums.doctype import DocType
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

User = get_user_model()


class Command(BaseCommand):
    help = 'Harvest public holidays from erp'

    def handle(self, *args, **options):
        user = User.objects.get(email='tharanath@kartoza.com')
        pull_holiday_list(user)
