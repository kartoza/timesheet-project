import logging
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from timesheet.utils.erp import pull_projects_from_erp, pull_user_data_from_erp

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Harvest data from erp'

    def handle(self, *args, **options):
        users = get_user_model().objects.all()
        print(f'Total user : {users.count()}')
        for user in users:
            if user.profile.api_secret:
                print(f'Updating {user}')
                pull_projects_from_erp(user)
