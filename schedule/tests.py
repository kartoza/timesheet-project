from datetime import datetime
from pytz import utc
from django.test import RequestFactory, TestCase, override_settings
from django.contrib.auth import get_user_model

from schedule.api_views.schedule import calculate_remaining_task_days
from timesheet.models import Task, Project
from schedule.models import UserProjectSlot, Schedule


class TaskTestCase(TestCase):
    def setUp(self):
        self.project = Project.objects.create(
            name='project',
            is_active=True
        )
        self.task = Task.objects.create(
            name='test',
            expected_time=400,
            actual_time=100,
            project=self.project
        )
        self.task.last_update = datetime(2023, 1, 1, tzinfo=utc)
        self.task.save(disable_auto_update=True)

        self.user = get_user_model().objects.create(
            first_name='test',
            last_name='test',
            username='test'
        )


class ScheduleTestCase(TaskTestCase):
    def setUp(self):
        super().setUp()
        self.user_project = UserProjectSlot.objects.create(
            project=self.project,
            user=self.user,
            active=True
        )


class TestCalculateRemainingTaskDays(ScheduleTestCase):
    def test_calculate_remaining_task_days(self):
        # Task last update = 01/01/2023
        # Task days left (hours/hour per day) = 300 / 7 = 42

        # Calculate remaining days if the schedule is occurred after the task's
        # last update date
        # The countdown => 42(4/4)-43(5/4)-44(6/4)-45(7/4)-46(8/4)
        start_time = datetime(2023, 4, 4, tzinfo=utc)
        end_time = datetime(2023, 4, 8, tzinfo=utc)
        remaining_task_days = calculate_remaining_task_days(
            self.task, start_time, end_time)
        self.assertEqual(remaining_task_days, 42)

        # Calculate remaining days if the schedule is occurred before the
        # task's last update date
        # The countdown would be 46(12/12)-45(13/12)-44(14/12)-43(15/12)
        start_time = datetime(2022, 12, 12, tzinfo=utc)
        end_time = datetime(2022, 12, 15, tzinfo=utc)
        remaining_task_days = calculate_remaining_task_days(
            self.task, start_time, end_time
        )
        self.assertEqual(remaining_task_days, 46)

        # Calculate remaining days if the schedule is occurred in the middle of
        # task's last update date
        # Countdown => 43(31/12/2022)-42(1/1/2023)-41(2/1/2023)
        start_time = datetime(2022, 12, 31, tzinfo=utc)
        end_time = datetime(2023, 1, 2, tzinfo=utc)
        remaining_task_days = calculate_remaining_task_days(
            self.task, start_time, end_time
        )
        self.assertEqual(remaining_task_days, 43)

        # Calculate remaining days if the schedule is occurred before the
        # task's last update date and there are existing schedules
        # Countdown => 49(1/12/2022)-48(2/12/2022)-47(3/12/2022)
        Schedule.objects.create(
            task=self.task,
            user_project=self.user_project,
            start_time=datetime(2022, 12, 31, tzinfo=utc),
            end_time=datetime(2023, 1, 2, tzinfo=utc)
        )
        Schedule.objects.create(
            task=self.task,
            user_project=self.user_project,
            start_time=datetime(2022, 12, 12, tzinfo=utc),
            end_time=datetime(2022, 12, 15, tzinfo=utc)
        )

        start_time = datetime(2022, 12, 1, tzinfo=utc)
        end_time = datetime(2022, 12, 3, tzinfo=utc)
        remaining_task_days = calculate_remaining_task_days(
            self.task, start_time, end_time
        )
        self.assertEqual(remaining_task_days, 49)

        # Calculate remaining days if the schedule is occurred after the task's
        # last update date and there are existing schedules
        # Countdown => 35(10/4)-34(11/4)-33(12/4)
        Schedule.objects.create(
            task=self.task,
            user_project=self.user_project,
            start_time=datetime(2023, 4, 4, tzinfo=utc),
            end_time=datetime(2023, 4, 8, tzinfo=utc)
        )
        start_time = datetime(2023, 4, 10, tzinfo=utc)
        end_time = datetime(2023, 4, 12, tzinfo=utc)
        remaining_task_days = calculate_remaining_task_days(
            self.task, start_time, end_time
        )
        self.assertEqual(remaining_task_days, 35)

