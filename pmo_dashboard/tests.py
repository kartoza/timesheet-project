from datetime import timedelta
from copy import deepcopy

from django.contrib.auth.models import Group
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from preferences import preferences
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from pmo_dashboard.models import BusinessUnit
from timesheet.models.preferences import get_default_pmo_status_config
from timesheet.models import Project, Task
from timesheet.models.project_member import ProjectMember

User = get_user_model()


class TestProjectListView(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='pmo_user', password='pass')
        pmo_group, _ = Group.objects.get_or_create(name='PMO')
        self.user.groups.add(pmo_group)
        self.client.login(username='pmo_user', password='pass')
        self.url = reverse('pmo-project-list')
        self.default_status_config = deepcopy(get_default_pmo_status_config())
        self.prefs = preferences.TimesheetPreferences
        self.prefs.pmo_status_config = deepcopy(self.default_status_config)
        self.prefs.save()
        self.prefs.pmo_allowed_groups.add(pmo_group)

    def tearDown(self):
        self.prefs.pmo_status_config = deepcopy(self.default_status_config)
        self.prefs.save()

    def test_dashboard_page_requires_authentication(self):
        response = APIClient().get(reverse('pmo-dashboard'))
        self.assertEqual(response.status_code, 302)

    def test_dashboard_page_for_authenticated_user(self):
        response = self.client.get(reverse('pmo-dashboard'))
        self.assertEqual(response.status_code, 200)

    def test_unauthenticated_returns_401(self):
        response = APIClient().get(self.url)
        self.assertEqual(response.status_code, 401)

    def test_authenticated_can_access_api(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)

    def test_authenticated_user_without_allowed_group_gets_403(self):
        outsider = User.objects.create_user(username='outsider', password='pass')
        client = APIClient()
        client.login(username='outsider', password='pass')

        dashboard_response = client.get(reverse('pmo-dashboard'))
        self.assertEqual(dashboard_response.status_code, 403)

        api_response = client.get(self.url)
        self.assertEqual(api_response.status_code, 403)

    def test_administrators_group_user_can_access_dashboard_and_api(self):
        admin_group, _ = Group.objects.get_or_create(name='Administrators')
        self.prefs.pmo_allowed_groups.add(admin_group)
        admin_user = User.objects.create_user(username='admin_group_user', password='pass')
        admin_user.groups.add(admin_group)

        client = APIClient()
        client.login(username='admin_group_user', password='pass')

        dashboard_response = client.get(reverse('pmo-dashboard'))
        self.assertEqual(dashboard_response.status_code, 200)

        api_response = client.get(self.url)
        self.assertEqual(api_response.status_code, 200)

    def test_superuser_can_access_dashboard_and_api(self):
        superuser = User.objects.create_superuser(
            username='super',
            email='super@example.com',
            password='pass',
        )
        client = APIClient()
        client.login(username='super', password='pass')

        dashboard_response = client.get(reverse('pmo-dashboard'))
        self.assertEqual(dashboard_response.status_code, 200)

        api_response = client.get(self.url)
        self.assertEqual(api_response.status_code, 200)

    def test_empty_list(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_project_fields_serialized_correctly(self):
        bu = BusinessUnit.objects.create(name='Tech')
        lead = User.objects.create_user(
            username='lead', email='lead@example.com',
            first_name='Alice', last_name='Smith'
        )
        rm = User.objects.create_user(
            username='rm', email='rm@example.com',
            first_name='Bob', last_name='Jones'
        )
        project = Project.objects.create(
            name='Test Project',
            is_active=True,
            business_unit=bu,
            project_type='EXTERNAL',
            customer='ACME',
            rag='GREEN',
            expected_end_date=timezone.localdate() + timedelta(days=10),
            project_lead=lead,
            relations_manager=rm,
            expected_time=100.0,
            actual_time=50.0,
            progress_in_hours=45.0,
            percent_complete=50.0,
            estimated_costing=10000.0,
            total_sales_amount=12000.0,
            total_costing_amount=8000.0,
            total_billable_amount=11000.0,
            total_billed_amount=9000.0,
            gross_margin=4000.0,
            per_gross_margin=33.33,
        )

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, 200)
        p = response.json()[0]

        self.assertEqual(p['id'], project.id)
        self.assertEqual(p['name'], 'Test Project')
        self.assertEqual(p['business_unit'], 'Tech')
        self.assertEqual(p['project_type'], 'EXTERNAL')
        self.assertEqual(p['customer'], 'ACME')
        self.assertEqual(p['status'], 'on_track')
        self.assertEqual(p['status_label'], 'On track')
        self.assertEqual(p['rag'], 'GREEN')
        self.assertEqual(p['project_manager'], 'Alice Smith')
        self.assertEqual(p['relations_manager'], 'Bob Jones')
        self.assertEqual(p['budget_hours'], 100.0)
        self.assertEqual(p['consumed_time'], 50.0)
        self.assertEqual(p['progress_in_hours'], 45.0)
        self.assertEqual(p['actual_progress'], 0.5)
        self.assertEqual(p['estimated_costing'], 10000.0)
        self.assertEqual(p['total_sales_amount'], 12000.0)
        self.assertEqual(p['total_costing'], 8000.0)
        self.assertEqual(p['total_billable_amount'], 11000.0)
        self.assertEqual(p['total_billed_amount'], 9000.0)
        self.assertEqual(p['gross_margin'], 4000.0)
        self.assertAlmostEqual(p['per_gross_margin'], 33.33, places=2)

    def test_inactive_project_not_returned_by_api(self):
        # The API filters to is_active=True, so inactive/completed projects are excluded.
        Project.objects.create(name='Done', is_active=False)
        self.assertEqual(self.client.get(self.url).json(), [])

    def test_warning_status_when_consumed_hours_hit_90_percent(self):
        project = Project.objects.create(
            name='Warning Hours',
            is_active=True,
            expected_end_date=timezone.localdate() + timedelta(days=10),
            expected_time=100.0,
            actual_time=90.0,
            total_sales_amount=1000.0,
            total_costing_amount=600.0,
        )
        data = {d['id']: d for d in self.client.get(self.url).json()}
        self.assertEqual(data[project.id]['status'], 'warning')

    def test_warning_status_when_cost_hits_70_percent(self):
        project = Project.objects.create(
            name='Warning Cost',
            is_active=True,
            expected_end_date=timezone.localdate() + timedelta(days=10),
            expected_time=100.0,
            actual_time=50.0,
            total_sales_amount=1000.0,
            total_costing_amount=700.0,
        )
        data = {d['id']: d for d in self.client.get(self.url).json()}
        self.assertEqual(data[project.id]['status'], 'warning')

    def test_at_risk_status_when_behind_schedule(self):
        project = Project.objects.create(
            name='At Risk Schedule',
            is_active=True,
            expected_end_date=timezone.localdate() - timedelta(days=1),
            expected_time=100.0,
            actual_time=50.0,
            total_sales_amount=1000.0,
            total_costing_amount=800.0,
        )
        data = {d['id']: d for d in self.client.get(self.url).json()}
        self.assertEqual(data[project.id]['status'], 'at_risk')

    def test_at_risk_status_when_consumed_hours_exceed_budget(self):
        project = Project.objects.create(
            name='At Risk Budget',
            is_active=True,
            expected_end_date=timezone.localdate() + timedelta(days=10),
            expected_time=100.0,
            actual_time=101.0,
            total_sales_amount=1000.0,
            total_costing_amount=600.0,
        )
        data = {d['id']: d for d in self.client.get(self.url).json()}
        self.assertEqual(data[project.id]['status'], 'at_risk')

    def test_at_risk_status_when_cost_exceeds_90_percent(self):
        project = Project.objects.create(
            name='At Risk Cost',
            is_active=True,
            expected_end_date=timezone.localdate() + timedelta(days=10),
            expected_time=100.0,
            actual_time=50.0,
            total_sales_amount=1000.0,
            total_costing_amount=901.0,
        )
        data = {d['id']: d for d in self.client.get(self.url).json()}
        self.assertEqual(data[project.id]['status'], 'at_risk')

    def test_overdue_status_when_all_overdue_conditions_match(self):
        project = Project.objects.create(
            name='Overdue Project',
            is_active=True,
            expected_end_date=timezone.localdate() - timedelta(days=1),
            expected_time=100.0,
            actual_time=110.0,
            total_sales_amount=1000.0,
            total_costing_amount=600.0,
        )
        data = {d['id']: d for d in self.client.get(self.url).json()}
        self.assertEqual(data[project.id]['status'], 'overdue')

    def test_on_hold_status_when_rag_is_hold(self):
        project = Project.objects.create(
            name='On Hold Project',
            is_active=True,
            rag='ON_HOLD',
            expected_end_date=timezone.localdate() + timedelta(days=10),
            expected_time=100.0,
            actual_time=50.0,
            total_sales_amount=1000.0,
            total_costing_amount=600.0,
        )
        data = {d['id']: d for d in self.client.get(self.url).json()}
        self.assertEqual(data[project.id]['status'], 'on_hold')

    def test_nullable_fields_when_not_set(self):
        Project.objects.create(name='Minimal', is_active=True)
        p = self.client.get(self.url).json()[0]
        self.assertIsNone(p['business_unit'])
        self.assertIsNone(p['project_manager'])
        self.assertIsNone(p['relations_manager'])
        self.assertIsNone(p['actual_progress'])
        self.assertIsNone(p['customer'])

    def test_user_display_falls_back_to_email_when_no_full_name(self):
        lead = User.objects.create_user(username='nofullname', email='nofull@example.com')
        Project.objects.create(name='P', is_active=True, project_lead=lead)
        p = self.client.get(self.url).json()[0]
        self.assertEqual(p['project_manager'], 'nofull@example.com')

    def test_team_members_serialized(self):
        project = Project.objects.create(name='Team Project', is_active=True)
        member = User.objects.create_user(
            username='member1', email='m@example.com',
            first_name='Charlie', last_name='D'
        )
        ProjectMember.objects.create(project=project, user=member, role='Developer', project_lead=True)

        p = self.client.get(self.url).json()[0]
        self.assertEqual(len(p['team_members']), 1)
        m = p['team_members'][0]
        self.assertEqual(m['id'], member.id)
        self.assertEqual(m['name'], 'Charlie D')
        self.assertEqual(m['role'], 'Developer')
        self.assertTrue(m['is_lead'])

    def test_team_member_without_user_excluded(self):
        project = Project.objects.create(name='Ghost Member', is_active=True)
        ProjectMember.objects.create(project=project, user=None, role='')
        p = self.client.get(self.url).json()[0]
        self.assertEqual(p['team_members'], [])

    def test_subtasks_only_includes_active(self):
        project = Project.objects.create(name='Task Project', is_active=True)
        Task.objects.create(name='Active Task', project=project, active=True, expected_time=10.0, actual_time=5.0)
        Task.objects.create(name='Inactive Task', project=project, active=False)

        p = self.client.get(self.url).json()[0]
        self.assertEqual(len(p['subtasks']), 1)
        self.assertEqual(p['subtasks'][0]['name'], 'Active Task')
        self.assertEqual(p['subtasks'][0]['budget_time'], 10.0)
        self.assertEqual(p['subtasks'][0]['consumed_time'], 5.0)

    def test_projects_ordered_by_name(self):
        Project.objects.create(name='Zebra')
        Project.objects.create(name='Alpha')
        names = [p['name'] for p in self.client.get(self.url).json()]
        self.assertEqual(names, sorted(names))

    def test_custom_status_label_from_preferences(self):
        custom_config = deepcopy(self.default_status_config)
        for status in custom_config['statuses']:
            if status['key'] == 'warning':
                status['label'] = 'Needs Attention'
        self.prefs.pmo_status_config = custom_config
        self.prefs.save()

        project = Project.objects.create(
            name='Warning Label',
            is_active=True,
            expected_end_date=timezone.localdate() + timedelta(days=10),
            expected_time=100.0,
            actual_time=90.0,
            total_sales_amount=1000.0,
            total_costing_amount=600.0,
        )

        data = {d['id']: d for d in self.client.get(self.url).json()}
        self.assertEqual(data[project.id]['status'], 'warning')
        self.assertEqual(data[project.id]['status_label'], 'Needs Attention')

    def test_custom_rule_changes_formula(self):
        custom_config = deepcopy(self.default_status_config)
        custom_config['rules'] = [
            {
                'status': 'completed',
                'when': {
                    'all': [
                        {'field': 'is_active', 'op': 'eq', 'value': False},
                    ],
                },
            },
            {
                'status': 'warning',
                'when': {
                    'all': [
                        {'field': 'hours_ratio', 'op': 'gte', 'value': 0.8},
                    ],
                },
            },
        ]
        self.prefs.pmo_status_config = custom_config
        self.prefs.save()

        project = Project.objects.create(
            name='Custom Formula',
            is_active=True,
            expected_end_date=timezone.localdate() + timedelta(days=10),
            expected_time=100.0,
            actual_time=80.0,
            total_sales_amount=1000.0,
            total_costing_amount=100.0,
        )

        data = {d['id']: d for d in self.client.get(self.url).json()}
        self.assertEqual(data[project.id]['status'], 'warning')

    def test_invalid_config_falls_back_to_default(self):
        self.prefs.pmo_status_config = {'broken': True}
        self.prefs.save()
        project = Project.objects.create(
            name='Fallback Formula',
            is_active=True,
            expected_end_date=timezone.localdate() + timedelta(days=10),
            expected_time=100.0,
            actual_time=90.0,
            total_sales_amount=1000.0,
            total_costing_amount=600.0,
        )

        data = {d['id']: d for d in self.client.get(self.url).json()}
        self.assertEqual(data[project.id]['status'], 'warning')
        self.assertEqual(data[project.id]['status_label'], 'Warning')
