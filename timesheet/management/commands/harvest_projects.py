from django.core.management.base import BaseCommand
from timesheet.models.project import Project
from timesheet.utils.erp import get_erp_data
from timesheet.enums.doctype import DocType


class Command(BaseCommand):
    help = 'Harvest projects from erpnext'

    def handle(self, *args, **options):
        projects = get_erp_data(DocType.PROJECT)
        for project in projects:
            Project.objects.get_or_create(
                name=project['name'],
                defaults={
                    'is_active': project['is_active'] == 'Yes'
                }
            )
