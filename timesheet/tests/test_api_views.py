import json
from http import HTTPStatus
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, Client
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from schedule.models import UserProjectSlot
from timesheet.models import Timelog, Project, SavedSummary, ProjectLink
from timesheet.models.user_project import UserProject
from timesheet.tests.model_factories import (
    TaskFactory, TimelogFactory, UserFactory, ActivityFactory
)

class TestPullProjectsView(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='user1',
            password='pass',
        )
        self.user.profile.save()
        self.client.login(username='user1', password='pass')
        self.url = reverse('pull-projects')

    @patch('timesheet.api_views.project.pull_projects_from_erp')
    @patch('timesheet.api_views.project.pull_user_data_from_erp')
    def test_pull_projects_success(self, mock_user_data, mock_projects):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'success': True})
        mock_projects.assert_called_once()

    @patch('timesheet.api_views.project.pull_projects_from_erp')
    @patch('timesheet.api_views.project.pull_user_data_from_erp')
    def test_pull_projects_user_data(self, mock_user_data, mock_projects):
        self.user.profile.save()
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'success': True})
        mock_projects.assert_called_once()
        mock_user_data.assert_called_once()


class TestProjectLinkListApiView(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='user2', password='pass2'
        )
        self.client.login(username='user2', password='pass2')
        self.project = Project.objects.create(name='Test Project')
        self.link1 = ProjectLink.objects.create(project=self.project, link='http://example.com')
        self.link2 = ProjectLink.objects.create(project=self.project, link='http://example2.com')
        self.url = reverse('project-links')  # Adjust to your URL pattern

    def test_get_project_links(self):
        response = self.client.get(self.url, {'id': self.project.id})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 2)
        self.assertIn('http://example.com', [d['link'] for d in data])


class TestProjectLinkApiView(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff_user = User.objects.create_user(
            username='staff', password='staff', is_staff=True
        )
        self.normal_user = User.objects.create_user(
            username='normal', password='normal', is_staff=False
        )
        self.project = Project.objects.create(name='Link Project')
        self.url = reverse('project-link')

    def test_create_project_link_staff_user(self):
        self.client.login(username='staff', password='staff')
        data = {
            'project': self.project.id,
            'link': 'http://newlink.com'
        }
        response = self.client.post(self.url, data=json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(ProjectLink.objects.filter(link='http://newlink.com').exists())

    def test_create_project_link_non_staff(self):
        self.client.login(username='normal', password='normal')
        data = {
            'project': self.project.id,
            'link': 'http://newlink.com'
        }
        response = self.client.post(self.url, data=json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, 403)

    def test_update_project_link(self):
        self.client.login(username='staff', password='staff')
        plink = ProjectLink.objects.create(project=self.project, link='http://oldlink.com')
        data = {
            'id': plink.id,
            'link': 'http://updatedlink.com'
        }
        response = self.client.post(self.url, data=json.dumps(data), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        plink.refresh_from_db()
        self.assertEqual(plink.link, 'http://updatedlink.com')

    def test_delete_project_link(self):
        self.client.login(username='staff', password='staff')
        plink = ProjectLink.objects.create(project=self.project, link='http://oldlink.com')
        delete_data = {
            'id': plink.id
        }
        response = self.client.delete(self.url, data=json.dumps(delete_data), content_type='application/json')
        self.assertEqual(response.status_code, 204)
        self.assertFalse(ProjectLink.objects.filter(id=plink.id).exists())


class TestProjectAutocomplete(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='autocomplete', password='pass')
        self.client.login(username='autocomplete', password='pass')
        self.project1 = Project.objects.create(name='Accounting System', is_active=True)
        self.project2 = Project.objects.create(name='Accounting App', is_active=True)
        UserProject.objects.create(
            user=self.user,
            project=self.project1
        )

        self.url = reverse('project-list')  # Adjust to your URL pattern

    def test_autocomplete_no_query(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_autocomplete_query(self):
        response = self.client.get(self.url, {'q': 'Account'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(len(data), 1)
        self.assertIn('Accounting System', [d['label'] for d in data])

    def test_autocomplete_ignore_user(self):
        # If ignoreUser=True, it should not filter by user
        response = self.client.get(self.url, {'q': 'Account', 'ignoreUser': 'True'})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        # Both projects should appear now since we ignore user filter
        self.assertEqual(len(data), 2)

    def test_autocomplete_with_user_id_and_slots(self):
        # Create a user_project_slot to exclude a project
        user2 = User.objects.create_user(username='anotheruser', password='pass')
        UserProjectSlot.objects.create(user=user2, project=self.project2, active=True)
        response = self.client.get(self.url, {'q': 'Account', 'user_id': user2.id})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 0)


class TestBurnDownChartDataView(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser', password='password'
        )
        self.client.login(username='testuser', password='password')
        self.url = reverse('burndown-chart-data')

    @patch('dashboard.api_views.get_burndown_chart_data')
    def test_get_burndown_chart_data(self, mock_burndown):
        mock_burndown.return_value = {'some': 'data'}
        response = self.client.get(self.url, {'project': 'Test Project'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'some': 'data'})


class TestListSummaryView(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser', password='password'
        )
        self.client.login(username='testuser', password='password')

        self.project = Project.objects.create(name='Test Project')
        self.summary = SavedSummary.objects.create(
            name='Test Summary',
            slug_name='test-summary',
            view_count=10,
            project=self.project,
            creator=self.user
        )
        self.url = reverse('list-summary')

    def test_list_summary(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['name'], 'Test Summary')
        self.assertEqual(data[0]['project_name'], 'Test Project')


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
