from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from pmo_dashboard.models import BusinessUnit
from timesheet.models import Project, Task
from timesheet.models.project_member import ProjectMember

User = get_user_model()


class TestProjectListView(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='pmo_user', password='pass')
        self.client.login(username='pmo_user', password='pass')
        self.url = reverse('pmo-project-list')

    def test_dashboard_page_requires_authentication(self):
        response = APIClient().get(reverse('pmo-dashboard'))
        self.assertEqual(response.status_code, 302)

    def test_dashboard_page_renders_for_authenticated_user(self):
        response = self.client.get(reverse('pmo-dashboard'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'pmo_dashboard/dashboard.html')

    def test_unauthenticated_returns_401(self):
        response = APIClient().get(self.url)
        self.assertEqual(response.status_code, 401)

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

    def test_inactive_project_status_is_completed(self):
        Project.objects.create(name='Done', is_active=False)
        p = self.client.get(self.url).json()[0]
        self.assertEqual(p['status'], 'completed')

    def test_rag_status_mapping(self):
        cases = [('GREEN', 'on_track'), ('AMBER', 'delayed'), ('RED', 'at_risk'), ('', 'on_track')]
        for rag, expected in cases:
            with self.subTest(rag=rag):
                proj = Project.objects.create(name=f'P-{rag}', is_active=True, rag=rag)
                data = {d['id']: d for d in self.client.get(self.url).json()}
                self.assertEqual(data[proj.id]['status'], expected)
                proj.delete()

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
