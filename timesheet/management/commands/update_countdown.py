from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from schedule.models import Schedule
from schedule.api_views.schedule import (
    update_previous_schedules, calculate_remaining_task_days,
    update_subsequent_schedules, _naive
)


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
            start_time = _naive(schedule.start_time)
            end_time = _naive(schedule.end_time)
            last_update = _naive(schedule.task.last_update)

            remaining_task_days = calculate_remaining_task_days(
                schedule.task,
                start_time,
                end_time
            )
            print('updating schedule {user} : {task} - {remaining_days}'.format(
                user=user.username,
                task=schedule.task.name,
                remaining_days=remaining_task_days
            ))
            last_day_number = (
                remaining_task_days - (schedule.end_time - schedule.start_time).days
            )
            schedule.first_day_number = remaining_task_days
            schedule.last_day_number = last_day_number
            schedule.save()

            updated = update_subsequent_schedules(
                start_time=start_time,
                task_id=schedule.task.id,
                last_day_number=last_day_number,
                excluded_schedule=schedule
            )
            if start_time < last_update:
                excluded_schedules = updated
                excluded_schedules.append(schedule.id)
                updated_previous = update_previous_schedules(
                    start_time,
                    schedule.task.id,
                    remaining_task_days,
                    excluded_schedules=excluded_schedules
                )
                updated += updated_previous

    def handle(self, *args, **options):
        users = get_user_model().objects.all()
        for user in users:
            self.update_schedule_countdown(user)
