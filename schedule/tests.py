from datetime import datetime, timedelta

from django.urls import reverse
from pytz import utc
from django.test import RequestFactory, TestCase, override_settings
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from schedule.api_views.schedule import (
    calculate_remaining_task_days,
    update_subsequent_schedules,
    update_previous_schedules,
)
from timesheet.models import Task, Project
from schedule.models import UserProjectSlot, Schedule


class TaskTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
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
            username='test',
            is_staff=True
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

    def create_schedule(self, start_time, end_time):
        return Schedule.objects.create(
            task=self.task,
            user_project=self.user_project,
            start_time=start_time,
            end_time=end_time
        )

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
        # (43)31/12-(42)1/1-(41)2/1
        self.create_schedule(
            start_time=datetime(2022, 12, 31, tzinfo=utc),
            end_time=datetime(2023, 1, 2, tzinfo=utc)
        )
        # (47)12/12-(46)13/12-(45)14/1-(44)15/1
        self.create_schedule(
            start_time=datetime(2022, 12, 12, tzinfo=utc),
            end_time=datetime(2022, 12, 15, tzinfo=utc)
        )

        # (50)1/12-(49)2/12-(48)3/1
        start_time = datetime(2022, 12, 1, tzinfo=utc)
        end_time = datetime(2022, 12, 3, tzinfo=utc)
        remaining_task_days = calculate_remaining_task_days(
            self.task, start_time, end_time
        )
        self.assertEqual(remaining_task_days, 50)

        # Calculate remaining days if the schedule is occurred after the task's
        # last update date and there are existing schedules
        # Countdown => 35(10/4)-34(11/4)-33(12/4)
        self.create_schedule(
            start_time=datetime(2023, 4, 4, tzinfo=utc),
            end_time=datetime(2023, 4, 8, tzinfo=utc)
        )
        start_time = datetime(2023, 4, 10, tzinfo=utc)
        end_time = datetime(2023, 4, 12, tzinfo=utc)
        remaining_task_days = calculate_remaining_task_days(
            self.task, start_time, end_time
        )
        self.assertEqual(remaining_task_days, 35)

    def test_update_subsequent_schedules(self):
        self.assertEqual(Schedule.objects.all().count(), 0)

        # Update all schedules that occurred after task's last update
        schedule1 = self.create_schedule(
            start_time=datetime(2023, 4, 8, tzinfo=utc),
            end_time=datetime(2023, 4, 10, tzinfo=utc)
        )
        schedule2 = self.create_schedule(
            start_time=datetime(2023, 5, 8, tzinfo=utc),
            end_time=datetime(2023, 5, 10, tzinfo=utc)
        )
        schedule3 = self.create_schedule(
            start_time=datetime(2023, 5, 8, tzinfo=utc),
            end_time=datetime(2023, 5, 10, tzinfo=utc)
        )
        new_schedule = self.create_schedule(
            start_time=datetime(2023, 3, 1, tzinfo=utc),
            end_time=datetime(2023, 3, 3, tzinfo=utc)
        )
        remaining_task_days = calculate_remaining_task_days(
            self.task, new_schedule.start_time, new_schedule.end_time
        )
        update_subsequent_schedules(
            new_schedule.start_time,
            self.task.id,
            remaining_task_days -
            (new_schedule.end_time - new_schedule.start_time).days,
            new_schedule
        )
        schedule1 = Schedule.objects.get(id=schedule1.id)
        self.assertEqual(schedule1.first_day_number, 39)
        self.assertEqual(schedule1.last_day_number, 37)

        schedule2 = Schedule.objects.get(id=schedule2.id)
        self.assertEqual(schedule2.first_day_number, 36)
        self.assertEqual(schedule2.last_day_number, 34)

        schedule3 = Schedule.objects.get(id=schedule3.id)
        self.assertEqual(schedule3.first_day_number, 33)
        self.assertEqual(schedule3.last_day_number, 31)

    def test_update_subsequent_schedules_2(self):
        # Update subsequent schedules when one of the schedules contains
        # the task's last update date
        # Task last update = 01/01/2023
        schedule1 = self.create_schedule(
            start_time=datetime(2022, 12, 31, tzinfo=utc),
            end_time=datetime(2023, 1, 2, tzinfo=utc)
        )
        schedule2 = self.create_schedule(
            start_time=datetime(2023, 1, 1, tzinfo=utc),
            end_time=datetime(2023, 1, 4, tzinfo=utc)
        )
        schedule3 = self.create_schedule(
            start_time=datetime(2023, 5, 8, tzinfo=utc),
            end_time=datetime(2023, 5, 10, tzinfo=utc)
        )
        new_schedule = self.create_schedule(
            start_time=datetime(2023, 1, 1, tzinfo=utc),
            end_time=datetime(2023, 1, 3, tzinfo=utc)
        )
        remaining_task_days = calculate_remaining_task_days(
            self.task, new_schedule.start_time, new_schedule.end_time
        )
        update_subsequent_schedules(
            new_schedule.start_time,
            self.task.id,
            remaining_task_days -
            (new_schedule.end_time - new_schedule.start_time).days,
            new_schedule
        )
        schedule1 = Schedule.objects.get(id=schedule1.id)
        self.assertEqual(schedule1.first_day_number, None)
        self.assertEqual(schedule1.last_day_number, None)

        schedule2 = Schedule.objects.get(id=schedule2.id)
        self.assertEqual(schedule2.first_day_number, 37)
        self.assertEqual(schedule2.last_day_number, 34)

        schedule3 = Schedule.objects.get(id=schedule3.id)
        self.assertEqual(schedule3.first_day_number, 33)
        self.assertEqual(schedule3.last_day_number, 31)

    def test_update_previous_schedules(self):
        # Test updates previous schedules if the new schedule is
        # occurred before task's last update
        # Task last update = 01/01/2023
        # 51 1/12-50 2/12-49 3/12
        schedule1 = self.create_schedule(
            start_time=datetime(2022, 12, 1, tzinfo=utc),
            end_time=datetime(2022, 12, 3, tzinfo=utc)
        )
        # 48 5/12-47 6/12-46 7/12
        schedule2 = self.create_schedule(
            start_time=datetime(2022, 12, 5, tzinfo=utc),
            end_time=datetime(2022, 12, 7, tzinfo=utc)
        )
        # 45(10/12)-44(11/12)-43(12/12)
        new_schedule = self.create_schedule(
            start_time=datetime(2022, 12, 10, tzinfo=utc),
            end_time=datetime(2022, 12, 12, tzinfo=utc)
        )
        remaining_task_days = calculate_remaining_task_days(
            self.task, new_schedule.start_time, new_schedule.end_time,
            new_schedule
        )
        update_previous_schedules(
            new_schedule.start_time,
            self.task.id,
            remaining_task_days,
            [new_schedule.id]
        )
        schedule1 = Schedule.objects.get(id=schedule1.id)
        self.assertEqual(schedule1.first_day_number, 51)
        self.assertEqual(schedule1.last_day_number, 49)

        schedule2 = Schedule.objects.get(id=schedule2.id)
        self.assertEqual(schedule2.first_day_number, 48)
        self.assertEqual(schedule2.last_day_number, 46)

    def test_add_schedule_after_task_last_update(self):
        self.client.force_authenticate(user=self.user)
        # 39-38-37
        start_time = datetime(2023, 5, 8, tzinfo=utc)
        end_time = datetime(2023, 5, 10, tzinfo=utc)

        # 42-41-40
        self.create_schedule(
            start_time=datetime(2023, 2, 8, tzinfo=utc),
            end_time=datetime(2023, 2, 10, tzinfo=utc)
        )

        url = reverse('add-schedule')
        data = {
            'task_id': self.task.id,
            'user_id': self.user_project.user_id,
            'start_time': int(start_time.timestamp() * 1000),
            'end_time': int(end_time.timestamp() * 1000),
        }
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        schedule = Schedule.objects.get(id=response.data['new']['id'])
        self.assertEqual(schedule.task.id, self.task.id)
        self.assertEqual(schedule.user_project.id, self.user_project.id)

        remaining_task_days = calculate_remaining_task_days(
            self.task, start_time, end_time
        )

        last_day_number = (
            remaining_task_days - (
                end_time - start_time
            ).days
        )

        self.assertEqual(schedule.first_day_number, remaining_task_days)
        self.assertEqual(schedule.last_day_number, last_day_number)

    def test_add_schedule_before_task_last_update(self):
        # Task last update = 01/01/2023
        self.client.force_authenticate(user=self.user)
        # (48)8/10 - (47)9/10 - (46)10/10
        start_time = datetime(2022, 10, 8, tzinfo=utc)
        end_time = datetime(2022, 10, 10, tzinfo=utc)

        # (45)8/12 - (44)9/12 - (43)10/12
        self.create_schedule(
            start_time=datetime(2022, 12, 8, tzinfo=utc),
            end_time=datetime(2022, 12, 10, tzinfo=utc)
        )

        url = reverse('add-schedule')
        data = {
            'task_id': self.task.id,
            'user_id': self.user_project.user_id,
            'start_time': int(start_time.timestamp() * 1000),
            'end_time': int(end_time.timestamp() * 1000),
        }
        response = self.client.post(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        schedule = Schedule.objects.get(id=response.data['new']['id'])
        self.assertEqual(schedule.task.id, self.task.id)
        self.assertEqual(schedule.user_project.id, self.user_project.id)

        self.assertEqual(schedule.first_day_number, 48)
        self.assertEqual(schedule.last_day_number, 46)

        data = {
            'task_id': self.task.id,
            'user_id': self.user_project.user_id,
            'start_time': int(datetime(2022, 12, 31, tzinfo=utc).timestamp()
                              * 1000),
            'end_time': int(datetime(2023, 1, 2, tzinfo=utc).timestamp()
                            * 1000),
        }
        response = self.client.post(url, data)
        prev_schedule = Schedule.objects.get(id=schedule.id)
        schedule = Schedule.objects.get(id=response.data['new']['id'])
        self.assertEqual(schedule.first_day_number, 43)
        self.assertEqual(prev_schedule.first_day_number, 49)

    def test_update_schedule_after_task_last_update(self):
        # Task last update = 01/01/2023
        self.client.force_authenticate(user=self.user)
        url = reverse('update-schedule')
        schedule = self.create_schedule(
            start_time=datetime(2023, 1, 8, tzinfo=utc),
            end_time=datetime(2023, 1, 10, tzinfo=utc)
        )
        data = {
            'schedule_id': schedule.id,
            'start_time': '09/1/2023',
            'end_time': '15/1/2023'
        }
        response = self.client.put(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        schedule = Schedule.objects.get(id=schedule.id)
        self.assertEqual(schedule.first_day_number, 42)
        self.assertEqual(schedule.last_day_number, 36)

        new_schedule = self.create_schedule(
            start_time=datetime(2023, 1, 2, tzinfo=utc),
            end_time=datetime(2023, 1, 5, tzinfo=utc)
        )
        data = {
            'schedule_id': new_schedule.id,
            'start_time': '02/1/2023',
            'end_time': '06/1/2023'
        }
        response = self.client.put(url, data)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        new_schedule = Schedule.objects.get(id=new_schedule.id)
        self.assertEqual(new_schedule.first_day_number, 42)
        self.assertEqual(new_schedule.last_day_number, 38)
        old_schedule = Schedule.objects.get(id=schedule.id)
        self.assertEqual(old_schedule.first_day_number, 37)
        self.assertEqual(old_schedule.last_day_number, 31)

    def test_update_schedule_before_task_last_update(self):
        # Task last update = 01/01/2023
        self.client.force_authenticate(user=self.user)
        url = reverse('update-schedule')
        schedule_2 = self.create_schedule(
            start_time=datetime(2022, 11, 8, tzinfo=utc),
            end_time=datetime(2022, 11, 10, tzinfo=utc)
        )
        schedule_3 = self.create_schedule(
            start_time=datetime(2023, 1, 8, tzinfo=utc),
            end_time=datetime(2023, 1, 10, tzinfo=utc)
        )
        schedule = self.create_schedule(
            start_time=datetime(2023, 1, 8, tzinfo=utc),
            end_time=datetime(2023, 1, 10, tzinfo=utc)
        )
        data = {
            'schedule_id': schedule.id,
            'start_time': '30/12/2022',
            'end_time': '2/1/2023'
        }
        response = self.client.put(url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        schedule = Schedule.objects.get(id=schedule.id)
        self.assertEqual(schedule.first_day_number, 46)
        self.assertEqual(schedule.last_day_number, 43)
        schedule2 = Schedule.objects.get(id=schedule_2.id)
        self.assertEqual(schedule2.first_day_number, 49)
        self.assertEqual(schedule2.last_day_number, 47)
        schedule_3 = Schedule.objects.get(id=schedule_3.id)
        self.assertEqual(schedule_3.first_day_number, 42)
        self.assertEqual(schedule_3.last_day_number, 40)

        data = {
            'schedule_id': schedule.id,
            'start_time': '28/12/2022',
            'end_time': '30/12/2022'
        }
        self.client.put(url, data)
        schedule = Schedule.objects.get(id=schedule.id)
        self.assertEqual(schedule.first_day_number, 48)
        self.assertEqual(schedule.last_day_number, 46)
        schedule2 = Schedule.objects.get(id=schedule_2.id)
        self.assertEqual(schedule2.first_day_number, 51)
        self.assertEqual(schedule2.last_day_number, 49)
        schedule_3 = Schedule.objects.get(id=schedule_3.id)
        self.assertEqual(schedule_3.first_day_number, 45)
        self.assertEqual(schedule_3.last_day_number, 43)

    def test_delete_schedule_after_last_task_update(self):
        self.client.force_authenticate(user=self.user)
        delete_url = reverse('delete-schedule')
        add_url = reverse('add-schedule')

        schedule = self.create_schedule(
            start_time=datetime(2023, 1, 8, tzinfo=utc),
            end_time=datetime(2023, 1, 10, tzinfo=utc)
        )

        start_time = datetime(2023, 5, 8, tzinfo=utc)
        end_time = datetime(2023, 5, 10, tzinfo=utc)
        data = {
            'task_id': self.task.id,
            'user_id': self.user_project.user_id,
            'start_time': int(start_time.timestamp() * 1000),
            'end_time': int(end_time.timestamp() * 1000),
        }
        response = self.client.post(add_url, data)
        new_schedule = Schedule.objects.get(id=response.data['new']['id'])
        self.assertEqual(new_schedule.first_day_number, 39)
        self.assertEqual(new_schedule.last_day_number, 37)

        response = self.client.post(
            delete_url, {
                'schedule_id': schedule.id
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        new_schedule = Schedule.objects.get(id=new_schedule.id)
        self.assertEqual(new_schedule.first_day_number, 42)
        self.assertEqual(new_schedule.last_day_number, 40)

    def test_delete_schedule_before_last_task_update(self):
        self.client.force_authenticate(user=self.user)
        delete_url = reverse('delete-schedule')
        add_url = reverse('add-schedule')
        schedule = self.create_schedule(
            start_time=datetime(2022, 10, 30, tzinfo=utc),
            end_time=datetime(2022, 11, 2, tzinfo=utc)
        )
        schedule2 = self.create_schedule(
            start_time=datetime(2022, 11, 25, tzinfo=utc),
            end_time=datetime(2022, 11, 30, tzinfo=utc)
        )
        schedule3 = self.create_schedule(
            start_time=datetime(2023, 1, 25, tzinfo=utc),
            end_time=datetime(2023, 1, 30, tzinfo=utc)
        )
        schedule4 = self.create_schedule(
            start_time=datetime(2023, 2, 25, tzinfo=utc),
            end_time=datetime(2023, 2, 28, tzinfo=utc)
        )
        start_time = datetime(2022, 12, 30, tzinfo=utc)
        end_time = datetime(2023, 1, 2, tzinfo=utc)
        data = {
            'task_id': self.task.id,
            'user_id': self.user_project.user_id,
            'start_time': int(start_time.timestamp() * 1000),
            'end_time': int(end_time.timestamp() * 1000),
        }
        response = self.client.post(add_url, data)
        new_schedule = Schedule.objects.get(id=response.data['new']['id'])
        self.assertEqual(new_schedule.first_day_number, 44)
        self.assertEqual(new_schedule.last_day_number, 41)

        schedule3 = Schedule.objects.get(id=schedule3.id)
        self.assertEqual(schedule3.first_day_number, 40)
        self.assertEqual(schedule3.last_day_number, 35)
        schedule2 = Schedule.objects.get(id=schedule2.id)
        self.assertEqual(schedule2.first_day_number, 50)
        self.assertEqual(schedule2.last_day_number, 45)

        response = self.client.post(
            delete_url, {
                'schedule_id': new_schedule.id
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        schedule3 = Schedule.objects.get(id=schedule3.id)
        self.assertEqual(schedule3.first_day_number, 42)
        self.assertEqual(schedule3.last_day_number, 37)
        schedule2 = Schedule.objects.get(id=schedule2.id)
        self.assertEqual(schedule2.first_day_number, 48)
        self.assertEqual(schedule2.last_day_number, 43)
