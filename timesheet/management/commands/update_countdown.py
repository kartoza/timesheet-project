from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from schedule.models import Schedule
from schedule.api_views.schedule import update_previous_schedules, calculate_remaining_task_days


class Command(BaseCommand):
    help = 'Update schedule countdown'

    def update_schedule_countdown(self, user):
        schedules = Schedule.objects.filter(
            user_project__user=user
        ).order_by('-start_time')
        updated_tasks = []
        for schedule in schedules:
            if not schedule.task:
                continue
            if schedule.task.id in updated_tasks:
                continue
            updated_tasks.append(
                schedule.task.id
            )
            remaining_task_days = calculate_remaining_task_days(
                schedule.task,
                schedule.start_time,
                schedule.end_time
            )
            print('updating schedule {user} : {task} - {remaining_days}'.format(
                user=user.username,
                task=schedule.task.name,
                remaining_days=remaining_task_days
            ))
            update_previous_schedules(
                start_time=schedule.start_time,
                task_id=schedule.task.id,
                remaining_days=remaining_task_days
            )

    def handle(self, *args, **options):
        users = get_user_model().objects.all()
        for user in users:
            self.update_schedule_countdown(user)
