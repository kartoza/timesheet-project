from django.core.management.base import BaseCommand

from timesheet.enums.doctype import DocType
from timesheet.models.project import Project
from timesheet.models.task import Task
from timesheet.utils.erp import get_erp_data


class Command(BaseCommand):
    help = 'Harvest tasks from erpnext'

    def handle(self, *args, **options):
        tasks = get_erp_data(DocType.TASK)
        for task in tasks:
            try:
                project = Project.objects.get(name=task['project'])
                task, created = Task.objects.get_or_create(
                    project=project,
                    name=task['subject'],
                    erp_id=task['name']
                )
                print(f'Task {project} - {"Created" if created else "Updated"}')
            except Project.DoesNotExist:
                print(f'Project {task["project"]} not found')
                continue
