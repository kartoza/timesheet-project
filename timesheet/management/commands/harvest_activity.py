import logging
from django.core.management.base import BaseCommand
from timesheet.models.activity import Activity
from timesheet.utils.erp import get_erp_data
from timesheet.enums.doctype import DocType

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Harvest activities from erp'

    def handle(self, *args, **options):
        activities = get_erp_data(DocType.ACTIVITY)

        for activity in activities:
            if 'name' not in activity:
                continue
            logger.info(f'{activity["name"]} added/updated')
            Activity.objects.get_or_create(
                name=activity['name']
            )
