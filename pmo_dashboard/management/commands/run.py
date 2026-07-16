import logging
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from timesheet.utils.erp import (
    pull_projects_only_from_erp
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Harvest data from erp'

    def handle(self, *args, **options):
        user = get_user_model().objects.filter(email='zakki@kartoza.com').first()

        profile = user.profile
        print(profile.erpnext_oauth_access_token)
        print(profile.erpnext_oauth_token)

        updated_projects = pull_projects_only_from_erp(
            user,
            filters='[["status", "=", "Open"]]',
        )
        print(updated_projects)
