import logging
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from timesheet.utils.erp import (
    pull_user_data_from_erp,
    pull_department_from_erp
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Harvest data from erp'

    def handle(self, *args, **options):
        users = get_user_model().objects.filter(is_active=True)
        print(f'Total user : {users.count()}')
        credentialed_user = None
        users = users.filter(email='zakki@kartoza.com')
        for user in users:
            pull_department_from_erp(user)
            pull_user_data_from_erp(user)
            # credentialed_user = user
        
