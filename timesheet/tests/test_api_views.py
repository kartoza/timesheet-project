import json
from http import HTTPStatus

from django.test import TestCase, Client
from rest_framework.test import APIClient

from timesheet.models import Timelog
from timesheet.tests.model_factories import (
    TaskFactory, TimelogFactory, UserFactory, ActivityFactory
)


class TestOnlineUserApiView(TestCase):
    def setUp(self) -> None:
        self.task = TaskFactory.create()
        self.activity = ActivityFactory.create()
        self.timesheet = (
            TimelogFactory.create(
                task=self.task,
                end_time=None
            )
        )
        self.user = UserFactory.create(
            password='password'
        )
        self.client = Client()

    def test_get_timesheet_list(self):
        logged_in = self.client.login(
            username=self.user.username, password='password')
        response = self.client.get(
            '/api/timesheet/'
        )
        self.assertEqual(
            response.status_code,
            200
        )
        self.assertEqual(
            int(response.json()[0]['task']['id']),
            self.task.id
        )

    def test_create_timesheet_no_login(self):
        response = self.client.post(
            '/api/timesheet/',
            {}
        )
        self.assertEqual(response.status_code, 302)

    def test_create_timesheet_authenticated(self):
        client = APIClient()
        client.login(
            username=self.user.username, password='password')
        data = json.dumps({
            'user': {
                'id': self.user.id
            },
            'task': {
                'id': self.task.id
            },
            'project': {
                'id': self.task.project.id
            },
            'start_time': '2022-12-12',
            'activity': {
                'id': self.activity.id
            }
        })
        response = client.post(
            '/api/timesheet/',
            data,
            content_type='application/json'
        )
        self.assertEqual(response.status_code, int(HTTPStatus.CREATED))

    def test_update_timesheet_authenticated(self):
        client = APIClient()
        client.login(
            username=self.user.username, password='password')
        timesheet = TimelogFactory.create(
            user=self.user
        )
        data = json.dumps({})
        response = client.put(
            f'/api/timesheet/{timesheet.id}/',
            data,
            content_type='application/json'
        )
        self.assertEqual(
            response.status_code,
            int(HTTPStatus.OK)
        )

        timesheet = Timelog.objects.get(
            id=timesheet.id
        )
        self.assertIsNotNone(
            timesheet.end_time
        )
