import logging
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from timesheet.utils.erp import (
    pull_projects_from_erp,
    pull_project_members_from_erp,
    pull_leave_data_from_erp,
    pull_holiday_list,
    pull_department_from_erp,
    pull_user_data_from_erp,
    update_schedule_countdown,
    get_erp_project_detail
)

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Harvest data from erp'

    def handle(self, *args, **options):
        users = get_user_model().objects.filter(is_active=True)
        print(f'Total user : {users.count()}')
        credentialed_user = None
        for user in users:
            if user.profile.api_secret or user.profile.erpnext_oauth_token:
                print(f'Updating {user}')
                get_erp_project_detail(
                    'CSA Africa Rangeland Watch Extension',
                    user=user
                )
        #         if credentialed_user is None:
        #             pull_department_from_erp(user)
        #             credentialed_user = user
        #         pull_projects_from_erp(user)
        #         pull_leave_data_from_erp(user)
        #         pull_holiday_list(user)
        #         update_schedule_countdown(user)
        #         pull_user_data_from_erp(user)

        # if credentialed_user:
        #     print('Updating project members')
        #     pull_project_members_from_erp(credentialed_user)

