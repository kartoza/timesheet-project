import datetime
import json
from http import HTTPStatus
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase, Client
from django.utils import timezone
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

    @patch('timesheet.api_views.project.check_erp_project_access')
    @patch('timesheet.api_views.project.pull_projects_from_erp')
    @patch('timesheet.api_views.project.pull_user_data_from_erp')
    def test_pull_projects_success(self, mock_user_data, mock_projects, mock_access):
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['success'], True)
        mock_access.assert_called_once()

    @patch('timesheet.api_views.project.check_erp_project_access')
    @patch('timesheet.api_views.project.pull_projects_from_erp')
    @patch('timesheet.api_views.project.pull_user_data_from_erp')
    def test_pull_projects_user_data(self, mock_user_data, mock_projects, mock_access):
        self.user.profile.save()
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['success'], True)
        mock_access.assert_called_once()

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
        self.assertEqual(response.status_code, 401)

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

    def test_create_timesheet_stops_existing_running_timesheet(self):
        client = APIClient()
        client.login(
            username=self.user.username, password='password')
        running_timesheet = TimelogFactory.create(
            user=self.user,
            task=self.task,
            project=self.task.project,
            activity=self.activity,
            end_time=None,
        )

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
        running_timesheet.refresh_from_db()
        self.assertIsNotNone(running_timesheet.end_time)
        self.assertTrue(
            Timelog.objects.filter(
                user=self.user,
                end_time__isnull=True,
            ).exclude(id=running_timesheet.id).exists()
        )

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

    def test_pause_timesheet_updates_description(self):
        self.client.login(
            username=self.user.username, password='password')
        timesheet = TimelogFactory.create(
            user=self.user,
            task=self.task,
            project=self.task.project,
            activity=self.activity,
            description='<p>Old description</p>',
            end_time=None
        )

        response = self.client.post(
            '/api/pause-timesheet/',
            data=json.dumps({
                'id': timesheet.id,
                'description': '<p>Updated description</p>',
            }),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, int(HTTPStatus.OK))
        timesheet.refresh_from_db()
        self.assertEqual(timesheet.description, '<p>Updated description</p>')
        self.assertTrue(timesheet.is_paused)
        self.assertIsNotNone(timesheet.end_time)

    def test_pause_child_timesheet_updates_root_description(self):
        self.client.login(
            username=self.user.username, password='password')
        root = TimelogFactory.create(
            user=self.user,
            task=self.task,
            project=self.task.project,
            activity=self.activity,
            description='<p>Root description</p>',
            end_time=timezone.now()
        )
        child = TimelogFactory.create(
            user=self.user,
            task=self.task,
            project=self.task.project,
            activity=self.activity,
            parent=root,
            description='<p>Child description</p>',
            end_time=None
        )

        response = self.client.post(
            '/api/pause-timesheet/',
            data=json.dumps({
                'id': child.id,
                'description': '<p>Latest description</p>',
            }),
            content_type='application/json'
        )

        self.assertEqual(response.status_code, int(HTTPStatus.OK))
        root.refresh_from_db()
        child.refresh_from_db()
        self.assertEqual(root.description, '<p>Latest description</p>')
        self.assertEqual(child.description, '<p>Latest description</p>')
        self.assertTrue(root.is_paused)


class TestTimelogListView(TestCase):
    """Tests the date range filtering of the time log list endpoint."""

    def setUp(self) -> None:
        self.user = UserFactory.create(password='password')
        self.client = APIClient()
        self.client.login(username=self.user.username, password='password')
        self.url = '/api/timelog/'

    def create_log_on(self, day, **kwargs):
        start_time = datetime.datetime(
            day.year, day.month, day.day, 9, 0,
            tzinfo=datetime.timezone.utc
        )
        kwargs.setdefault('end_time', start_time + datetime.timedelta(hours=1))
        return TimelogFactory.create(
            user=self.user,
            start_time=start_time,
            **kwargs
        )

    def test_list_without_range_returns_every_log(self):
        self.create_log_on(datetime.date(2024, 1, 10))
        self.create_log_on(datetime.date(2024, 6, 20))

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 2)

    def test_list_only_returns_logs_within_the_range(self):
        self.create_log_on(datetime.date(2024, 3, 4))
        in_range = self.create_log_on(datetime.date(2024, 3, 6))
        self.create_log_on(datetime.date(2024, 3, 12))

        response = self.client.get(
            self.url, {'start': '2024-03-05', 'end': '2024-03-10'})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [log['id'] for log in response.json()], [in_range.id])

    def test_range_boundaries_are_inclusive(self):
        self.create_log_on(datetime.date(2024, 3, 5))
        self.create_log_on(datetime.date(2024, 3, 10))

        response = self.client.get(
            self.url, {'start': '2024-03-05', 'end': '2024-03-10'})

        self.assertEqual(len(response.json()), 2)

    def test_running_and_paused_logs_survive_the_range(self):
        running = self.create_log_on(datetime.date(2024, 1, 1), end_time=None)
        paused = self.create_log_on(datetime.date(2024, 1, 2), is_paused=True)

        response = self.client.get(
            self.url, {'start': '2024-03-05', 'end': '2024-03-10'})

        self.assertEqual(
            sorted(log['id'] for log in response.json()),
            sorted([running.id, paused.id])
        )

    def test_incomplete_range_is_rejected(self):
        response = self.client.get(self.url, {'start': '2024-03-05'})
        self.assertEqual(response.status_code, 400)

    def test_malformed_date_is_rejected(self):
        response = self.client.get(
            self.url, {'start': '05-03-2024', 'end': '2024-03-10'})
        self.assertEqual(response.status_code, 400)

    def test_reversed_range_is_rejected(self):
        response = self.client.get(
            self.url, {'start': '2024-03-10', 'end': '2024-03-05'})
        self.assertEqual(response.status_code, 400)

    def test_excessive_range_is_rejected(self):
        response = self.client.get(
            self.url, {'start': '2020-01-01', 'end': '2024-01-01'})
        self.assertEqual(response.status_code, 400)


class TestPullTimelogsView(TestCase):
    """Tests importing already submitted timesheet entries back from ERPNext."""

    def setUp(self) -> None:
        self.user = UserFactory.create(password='password')
        self.user.profile.employee_id = 'HR-EMP-001'
        self.user.profile.timezone = 'UTC'
        self.user.profile.save()
        self.task = TaskFactory.create(erp_id='TASK-001')
        self.client = APIClient()
        self.client.login(username=self.user.username, password='password')
        self.url = '/api/pull-timesheet/'

    def erp_row(self, **overrides):
        row = {
            'name': 'row-1',
            'from_time': '2024-03-06 09:00:00',
            'to_time': '2024-03-06 11:00:00',
            'task': 'TASK-001',
            'project': self.task.project.name,
            'activity_type': '',
            'description': 'Did the thing',
        }
        row.update(overrides)
        return row

    def pull(self, rows, start='2024-03-04', end='2024-03-10'):
        with patch('timesheet.utils.erp.get_erp_data',
                   return_value=[{'name': 'TS-001'}]), \
             patch('timesheet.utils.erp.get_erp_timesheet_detail',
                   return_value={'time_logs': rows}):
            return self.client.post(
                self.url,
                data=json.dumps({'start': start, 'end': end}),
                content_type='application/json'
            )

    def test_entries_are_imported_as_submitted_timelogs(self):
        response = self.pull([self.erp_row()])

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['created'], 1)
        timelog = Timelog.objects.get(user=self.user)
        self.assertTrue(timelog.submitted)
        self.assertEqual(timelog.erp_id, 'row-1')
        self.assertEqual(timelog.task, self.task)
        self.assertEqual(timelog.description, '<p>Did the thing</p>')
        self.assertEqual(
            timelog.start_time.strftime('%Y-%m-%d %H:%M'), '2024-03-06 09:00')

    def test_markdown_description_is_stored_as_html(self):
        self.pull([self.erp_row(description=(
            '* [3] [Fix the thing #5488](https://github.com/kartoza/bims/issues/5488)'
        ))])

        self.assertEqual(
            Timelog.objects.get(user=self.user).description,
            '<ul><li>[3] <a href="https://github.com/kartoza/bims/issues/5488" '
            'rel="noopener noreferrer" target="_blank">Fix the thing #5488</a>'
            '</li></ul>'
        )

    def test_same_task_and_description_on_a_day_is_grouped(self):
        """Two stretches of the same work become one root with a child."""
        response = self.pull([
            self.erp_row(name='row-a',
                         from_time='2024-03-06 08:38:00',
                         to_time='2024-03-06 09:30:00',
                         description='* [1] Update production sites'),
            self.erp_row(name='row-b',
                         from_time='2024-03-06 09:48:00',
                         to_time='2024-03-06 10:01:00',
                         description='* [1] Update production sites'),
        ])

        self.assertEqual(response.json()['created'], 2)
        roots = Timelog.objects.filter(user=self.user, parent__isnull=True)
        self.assertEqual(roots.count(), 1)
        root = roots.first()
        self.assertEqual(root.erp_id, 'row-a')
        self.assertEqual(
            [c.erp_id for c in root.children.all()], ['row-b'])

    def test_different_descriptions_are_not_grouped(self):
        self.pull([
            self.erp_row(name='row-a', description='* [1] One thing'),
            self.erp_row(name='row-b',
                         from_time='2024-03-06 13:00:00',
                         to_time='2024-03-06 14:00:00',
                         description='* [2] Another thing'),
        ])

        self.assertEqual(
            Timelog.objects.filter(user=self.user, parent__isnull=True).count(),
            2
        )

    def test_same_work_on_different_days_is_not_grouped(self):
        """Chains never span days, matching how resume behaves."""
        self.pull([
            self.erp_row(name='row-a',
                         from_time='2024-03-06 09:00:00',
                         to_time='2024-03-06 10:00:00'),
            self.erp_row(name='row-b',
                         from_time='2024-03-07 09:00:00',
                         to_time='2024-03-07 10:00:00'),
        ])

        self.assertEqual(
            Timelog.objects.filter(user=self.user, parent__isnull=True).count(),
            2
        )

    def test_grouping_leaves_locally_tracked_logs_alone(self):
        local = TimelogFactory.create(
            user=self.user,
            task=self.task,
            start_time=datetime.datetime(
                2024, 3, 6, 8, 0, tzinfo=datetime.timezone.utc),
            end_time=datetime.datetime(
                2024, 3, 6, 9, 0, tzinfo=datetime.timezone.utc),
            description='<p>Did the thing</p>',
        )

        self.pull([
            self.erp_row(name='row-a'),
            self.erp_row(name='row-b',
                         from_time='2024-03-06 13:00:00',
                         to_time='2024-03-06 14:00:00'),
        ])

        local.refresh_from_db()
        self.assertIsNone(local.parent)
        self.assertEqual(local.children.count(), 0)

    def test_a_later_pull_attaches_to_the_existing_root(self):
        self.pull([self.erp_row(name='row-a')])
        self.pull([
            self.erp_row(name='row-a'),
            self.erp_row(name='row-b',
                         from_time='2024-03-06 13:00:00',
                         to_time='2024-03-06 14:00:00'),
        ])

        roots = Timelog.objects.filter(user=self.user, parent__isnull=True)
        self.assertEqual(roots.count(), 1)
        self.assertEqual(roots.first().erp_id, 'row-a')
        self.assertEqual(roots.first().children.count(), 1)

    def test_pulling_twice_does_not_duplicate(self):
        self.pull([self.erp_row()])
        response = self.pull([self.erp_row()])

        self.assertEqual(response.json()['created'], 0)
        self.assertEqual(response.json()['existing'], 1)
        self.assertEqual(Timelog.objects.filter(user=self.user).count(), 1)

    def test_unknown_task_is_skipped_and_counted(self):
        response = self.pull([
            self.erp_row(name='row-2', task='NOPE', project='Nope')
        ])

        self.assertEqual(response.json()['created'], 0)
        self.assertEqual(response.json()['skipped'], 1)
        self.assertFalse(Timelog.objects.filter(user=self.user).exists())

    def test_entries_outside_the_range_are_dropped(self):
        response = self.pull([
            self.erp_row(name='row-3',
                         from_time='2024-03-20 09:00:00',
                         to_time='2024-03-20 11:00:00')
        ])

        self.assertEqual(response.json()['created'], 0)
        self.assertFalse(Timelog.objects.filter(user=self.user).exists())

    def test_missing_employee_id_reports_an_error(self):
        self.user.profile.employee_id = ''
        self.user.profile.save()

        response = self.pull([self.erp_row()])

        self.assertEqual(response.status_code, 502)
        self.assertIn('employee ID', response.json()['detail'])

    def test_invalid_range_is_rejected(self):
        response = self.client.post(
            self.url,
            data=json.dumps({'start': '2024-03-10', 'end': '2024-03-05'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
