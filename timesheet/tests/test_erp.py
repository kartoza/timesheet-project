import datetime
from django.contrib.auth import get_user_model
from django.test import TestCase
from unittest.mock import patch, PropertyMock
from django.conf import settings
from timesheet.models import Timelog, Project
from timesheet.models.project_member import ProjectMember
from timesheet.serializers.timesheet import TimelogSerializerERP
from timesheet.tests.model_factories import (
    TimelogFactory,
    UserFactory,
    ProjectFactory,
)
from timesheet.models.department import Department
from timesheet.utils.erp import (
    push_timesheet_to_erp,
    pull_projects_from_erp,
    pull_project_members_from_erp,
    pull_department_from_erp,
    pull_user_data_from_erp,
    compute_sales_totals_by_project,
    get_exchange_rate,
    ProjectsNotFound,
    _resolve_issue_customer,
)
from pmo_dashboard.models import BusinessUnit, SupportContactMapping

# Mocking the settings.ERPNEXT_SITE_LOCATION
mocked_erp_site = PropertyMock(return_value="https://erp_example.com")
type(settings).ERPNEXT_SITE_LOCATION = mocked_erp_site


class TestErpHelper(TestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.timelog1 = TimelogFactory.create(
            user=self.user
        )

    def test_timelog_serializer_erp(self):
        timelog = TimelogFactory.create(
            user=self.user,
            timezone='Asia/Jakarta',
            start_time=datetime.datetime(2023, 10, 20, 20, 58)
        )
        timelog_data = TimelogSerializerERP(
            timelog
        )
        self.assertEqual(
            timelog_data.data['from_time'],
            '2023-10-20 13:58:00'
        )

    @patch('requests.post')
    def test_push_timesheet_to_erp_successful_submission(self, mock_post):
        # Mock a successful response from ERPNEXT
        mock_response = mock_post.return_value
        mock_response.status_code = 200

        # Call your function
        push_timesheet_to_erp(Timelog.objects.all(), self.user)

        mock_post.assert_called()

        # 2. Check time logs are marked as submitted
        self.timelog1.refresh_from_db()
        self.assertTrue(self.timelog1.submitted)

    @patch('requests.post')
    def test_push_timesheet_to_erp_unsuccessful_submission(self, mock_post):
        mock_response = mock_post.return_value
        mock_response.status_code = 400

        push_timesheet_to_erp(Timelog.objects.all(), self.user)

        mock_post.assert_called()

        self.timelog1.refresh_from_db()
        self.assertFalse(self.timelog1.submitted)


ERP_PROJECT_DATA = {
    'name': 'ERP Project Alpha',
    'status': 'Open',
    'project_type': 'External',
    'custom_business_unit': 'Engineering',
    'expected_start_date': '2026-01-01',
    'expected_end_date': '2026-12-31',
    'project_lead': 'lead@example.com',
    'custom_project_relations_manager': 'rm@example.com',
    'customer': 'ACME Corp',
    'rag': 'GREEN',
    'expected_time': 200.0,
    'actual_time': 80.0,
    'progress_in_hours': 75.0,
    'percent_complete': 40.0,
    'estimated_costing': 50000.0,
    'total_sales_amount': 60000.0,
    'total_costing_amount': 45000.0,
    'total_billable_amount': 58000.0,
    'total_billed_amount': 30000.0,
    'gross_margin': 15000.0,
    'per_gross_margin': 25.0,
}


@patch('timesheet.utils.erp.get_erp_data')
class TestPullProjectsFromErp(TestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.user.profile.save()

    def _mock_erp(self, mock, projects):
        # pull_projects_from_erp calls get_erp_data three times: projects, tasks, activities.
        mock.side_effect = [projects, [], []]

    def test_raises_when_no_projects(self, mock_get_erp_data):
        self._mock_erp(mock_get_erp_data, [])
        with self.assertRaises(ProjectsNotFound):
            pull_projects_from_erp(self.user)

    def test_creates_project(self, mock_get_erp_data):
        self._mock_erp(mock_get_erp_data, [ERP_PROJECT_DATA])
        pull_projects_from_erp(self.user)
        self.assertTrue(Project.objects.filter(name='ERP Project Alpha').exists())

    def test_project_fields_saved(self, mock_get_erp_data):
        self._mock_erp(mock_get_erp_data, [ERP_PROJECT_DATA])
        pull_projects_from_erp(self.user)
        p = Project.objects.get(name='ERP Project Alpha')
        self.assertTrue(p.is_active)
        self.assertEqual(p.project_type, 'EXTERNAL')
        self.assertEqual(p.customer, 'ACME Corp')
        self.assertEqual(p.rag, 'GREEN')
        self.assertEqual(p.expected_time, 200.0)
        self.assertEqual(p.progress_in_hours, 75.0)
        self.assertEqual(p.gross_margin, 15000.0)
        self.assertEqual(p.per_gross_margin, 25.0)

    def test_business_unit_created_and_assigned(self, mock_get_erp_data):
        self._mock_erp(mock_get_erp_data, [ERP_PROJECT_DATA])
        pull_projects_from_erp(self.user)
        bu = BusinessUnit.objects.get(name='Engineering')
        p = Project.objects.get(name='ERP Project Alpha')
        self.assertEqual(p.business_unit, bu)

    def test_project_lead_user_created_by_email(self, mock_get_erp_data):
        self._mock_erp(mock_get_erp_data, [ERP_PROJECT_DATA])
        pull_projects_from_erp(self.user)
        p = Project.objects.get(name='ERP Project Alpha')
        self.assertIsNotNone(p.project_lead)
        self.assertEqual(p.project_lead.email, 'lead@example.com')

    def test_relations_manager_user_created_by_email(self, mock_get_erp_data):
        self._mock_erp(mock_get_erp_data, [ERP_PROJECT_DATA])
        pull_projects_from_erp(self.user)
        p = Project.objects.get(name='ERP Project Alpha')
        self.assertIsNotNone(p.relations_manager)
        self.assertEqual(p.relations_manager.email, 'rm@example.com')

    def test_existing_project_updated(self, mock_get_erp_data):
        Project.objects.create(name='ERP Project Alpha', is_active=False, rag='RED')
        self._mock_erp(mock_get_erp_data, [ERP_PROJECT_DATA])
        pull_projects_from_erp(self.user)
        p = Project.objects.get(name='ERP Project Alpha')
        self.assertTrue(p.is_active)
        self.assertEqual(p.rag, 'GREEN')
        self.assertEqual(Project.objects.filter(name='ERP Project Alpha').count(), 1)

    def test_closed_project_set_inactive(self, mock_get_erp_data):
        closed = dict(ERP_PROJECT_DATA, name='Closed Project', status='Closed')
        self._mock_erp(mock_get_erp_data, [closed])
        pull_projects_from_erp(self.user)
        self.assertFalse(Project.objects.get(name='Closed Project').is_active)

    def test_missing_business_unit_leaves_field_null(self, mock_get_erp_data):
        self._mock_erp(mock_get_erp_data, [dict(ERP_PROJECT_DATA, custom_business_unit='')])
        pull_projects_from_erp(self.user)
        self.assertIsNone(Project.objects.get(name='ERP Project Alpha').business_unit)

    def test_missing_project_lead_leaves_field_null(self, mock_get_erp_data):
        self._mock_erp(mock_get_erp_data, [dict(ERP_PROJECT_DATA, project_lead='')])
        pull_projects_from_erp(self.user)
        self.assertIsNone(Project.objects.get(name='ERP Project Alpha').project_lead)


COMPANIES = [
    {'name': 'Kartoza (Pty) Ltd', 'default_currency': 'ZAR'},
    {'name': 'Kartoza Lda', 'default_currency': 'EUR'},
]


@patch('requests.get')
@patch('timesheet.utils.erp.get_erp_data')
class TestComputeSalesTotalsByProject(TestCase):
    def _mock(self, mock_get_erp_data, orders, items, companies=COMPANIES):
        mock_get_erp_data.side_effect = [companies, orders, items]

    def test_item_level_link_sums_base_net_amount(self, mock_get_erp_data, mock_requests_get):
        orders = [{
            'name': 'SO-A', 'company': 'Kartoza (Pty) Ltd', 'project': 'Should Not Be Used',
            'base_net_total': 999999, 'delivery_date': '2026-01-01',
        }]
        items = [
            {'parent': 'SO-A', 'custom_project': 'Project X', 'base_net_amount': 600.0, 'delivery_date': '2026-01-01'},
            {'parent': 'SO-A', 'custom_project': 'Project Y', 'base_net_amount': 400.0, 'delivery_date': '2026-01-03'},
        ]
        self._mock(mock_get_erp_data, orders, items)

        totals = compute_sales_totals_by_project()

        self.assertEqual(totals, {'Project X': 600.0, 'Project Y': 400.0})
        self.assertNotIn('Should Not Be Used', totals)
        mock_requests_get.assert_not_called()

    def test_fallback_to_order_project_when_no_items_linked(self, mock_get_erp_data, mock_requests_get):
        orders = [{
            'name': 'SO-B', 'company': 'Kartoza (Pty) Ltd', 'project': 'Fallback Project',
            'base_net_total': 500.0, 'delivery_date': '2026-01-02',
        }]
        self._mock(mock_get_erp_data, orders, [])

        totals = compute_sales_totals_by_project()

        self.assertEqual(totals, {'Fallback Project': 500.0})

    def test_order_with_no_project_and_no_items_contributes_nothing(self, mock_get_erp_data, mock_requests_get):
        orders = [{
            'name': 'SO-C', 'company': 'Kartoza (Pty) Ltd', 'project': '',
            'base_net_total': 500.0, 'delivery_date': '2026-01-02',
        }]
        self._mock(mock_get_erp_data, orders, [])

        totals = compute_sales_totals_by_project()

        self.assertEqual(totals, {})

    def test_non_zar_company_converted_using_delivery_date_rate(self, mock_get_erp_data, mock_requests_get):
        orders = [{
            'name': 'SO-D', 'company': 'Kartoza Lda', 'project': 'EUR Project',
            'base_net_total': 500.0, 'delivery_date': '2026-01-02',
        }]
        mock_response = mock_requests_get.return_value
        mock_response.status_code = 200
        mock_response.json.return_value = {'rates': {'ZAR': 20.0}}
        self._mock(mock_get_erp_data, orders, [])

        totals = compute_sales_totals_by_project()

        self.assertEqual(totals, {'EUR Project': 10000.0})
        called_url = mock_requests_get.call_args.args[0]
        self.assertIn('2026-01-02', called_url)
        self.assertIn('base=EUR', called_url)


@patch('requests.get')
class TestGetExchangeRate(TestCase):
    def _mock_ok(self, mock_requests_get, rate=20.0):
        mock_response = mock_requests_get.return_value
        mock_response.status_code = 200
        mock_response.json.return_value = {'rates': {'ZAR': rate}}

    def test_same_currency_skips_request(self, mock_requests_get):
        rate = get_exchange_rate('2026-01-01', 'ZAR', 'ZAR')
        self.assertEqual(rate, 1.0)
        mock_requests_get.assert_not_called()

    def test_past_date_uses_historical_endpoint(self, mock_requests_get):
        self._mock_ok(mock_requests_get)
        get_exchange_rate('2026-01-01', 'EUR')
        called_url = mock_requests_get.call_args.args[0]
        self.assertIn('/v1/2026-01-01', called_url)

    def test_future_date_falls_back_to_latest(self, mock_requests_get):
        # frankfurter.dev 404s for dates that haven't happened yet - common for
        # Sales Order Items with a future delivery_date milestone.
        self._mock_ok(mock_requests_get)
        get_exchange_rate('2099-01-01', 'EUR')
        called_url = mock_requests_get.call_args.args[0]
        self.assertIn('/v1/latest', called_url)
        self.assertNotIn('2099-01-01', called_url)

    def test_missing_date_falls_back_to_latest(self, mock_requests_get):
        self._mock_ok(mock_requests_get)
        get_exchange_rate(None, 'EUR')
        called_url = mock_requests_get.call_args.args[0]
        self.assertIn('/v1/latest', called_url)

    def test_malformed_date_falls_back_to_latest(self, mock_requests_get):
        self._mock_ok(mock_requests_get)
        get_exchange_rate('not-a-date', 'EUR')
        called_url = mock_requests_get.call_args.args[0]
        self.assertIn('/v1/latest', called_url)


@patch('timesheet.utils.erp.get_erp_project_detail')
class TestPullProjectMembersFromErp(TestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.user.profile.save()
        self.project = ProjectFactory.create(name='Alpha Project')

    def _detail(self, members, project_lead=''):
        return {'project_team_members': members, 'project_lead': project_lead}

    def test_creates_project_members(self, mock_detail):
        mock_detail.return_value = self._detail(
            [{'employee': 'dev@example.com', 'role': 'Developer'}]
        )
        pull_project_members_from_erp(self.user)
        self.assertEqual(ProjectMember.objects.filter(project=self.project).count(), 1)
        m = ProjectMember.objects.get(project=self.project)
        self.assertEqual(m.user.email, 'dev@example.com')
        self.assertEqual(m.role, 'Developer')

    def test_project_lead_in_team_sets_flag(self, mock_detail):
        mock_detail.return_value = self._detail(
            [{'employee': 'lead@example.com', 'role': 'Lead'}],
            project_lead='lead@example.com'
        )
        pull_project_members_from_erp(self.user)
        m = ProjectMember.objects.get(project=self.project)
        self.assertTrue(m.project_lead)

    def test_project_lead_not_in_team_synthesized(self, mock_detail):
        mock_detail.return_value = self._detail(
            [{'employee': 'dev@example.com', 'role': 'Dev'}],
            project_lead='lead@example.com'
        )
        pull_project_members_from_erp(self.user)
        members = ProjectMember.objects.filter(project=self.project)
        self.assertEqual(members.count(), 2)
        lead_member = members.get(user__email='lead@example.com')
        self.assertTrue(lead_member.project_lead)
        self.assertFalse(members.get(user__email='dev@example.com').project_lead)

    def test_old_members_cleared_before_sync(self, mock_detail):
        existing_user = get_user_model().objects.create_user(
            username='old', email='old@example.com'
        )
        ProjectMember.objects.create(project=self.project, user=existing_user)
        mock_detail.return_value = self._detail(
            [{'employee': 'new@example.com', 'role': ''}]
        )
        pull_project_members_from_erp(self.user)
        self.assertFalse(ProjectMember.objects.filter(user__email='old@example.com').exists())
        self.assertTrue(ProjectMember.objects.filter(user__email='new@example.com').exists())

    def test_user_created_if_not_exist(self, mock_detail):
        mock_detail.return_value = self._detail(
            [{'employee': 'newuser@example.com', 'role': ''}]
        )
        pull_project_members_from_erp(self.user)
        self.assertTrue(
            get_user_model().objects.filter(email='newuser@example.com').exists()
        )

    def test_duplicate_member_emails_deduplicated(self, mock_detail):
        mock_detail.return_value = self._detail([
            {'employee': 'dup@example.com', 'role': 'A'},
            {'employee': 'dup@example.com', 'role': 'B'},
        ])
        pull_project_members_from_erp(self.user)
        self.assertEqual(ProjectMember.objects.filter(project=self.project).count(), 1)

    def test_no_projects_returns_early(self, mock_detail):
        Project.objects.all().delete()
        pull_project_members_from_erp(self.user)
        mock_detail.assert_not_called()

    def test_stale_project_with_unsubmitted_timelogs_set_inactive(self, mock_detail):
        mock_detail.return_value = {}
        TimelogFactory.create(user=self.user, project=self.project, task=None, submitted=False)
        pull_project_members_from_erp(self.user)
        self.project.refresh_from_db()
        self.assertFalse(self.project.is_active)
        self.assertTrue(Project.objects.filter(pk=self.project.pk).exists())

    def test_stale_project_with_no_timelogs_deleted(self, mock_detail):
        mock_detail.return_value = {}
        pull_project_members_from_erp(self.user)
        self.assertFalse(Project.objects.filter(pk=self.project.pk).exists())

    def test_stale_project_with_only_submitted_timelogs_deleted(self, mock_detail):
        mock_detail.return_value = {}
        TimelogFactory.create(user=self.user, project=self.project, task=None, submitted=True)
        pull_project_members_from_erp(self.user)
        self.assertFalse(Project.objects.filter(pk=self.project.pk).exists())

@patch('timesheet.utils.erp.get_erp_data')
class TestPullDepartmentFromErp(TestCase):
    def test_creates_department_and_group(self, mock_get_erp_data):
        mock_get_erp_data.return_value = [
            {'name': 'PMO - K', 'department_name': 'PMO', 'disabled': 0},
        ]
        pull_department_from_erp()
        dept = Department.objects.get(erp_id='PMO - K')
        self.assertEqual(dept.name, 'PMO')
        self.assertIsNotNone(dept.group)
        self.assertEqual(dept.group.name, 'PMO')

    def test_updates_existing_department(self, mock_get_erp_data):
        from django.contrib.auth.models import Group
        group = Group.objects.create(name='PMO')
        Department.objects.create(erp_id='PMO - K', name='PMO Old', group=group)
        mock_get_erp_data.return_value = [
            {'name': 'PMO - K', 'department_name': 'PMO', 'disabled': 0},
        ]
        pull_department_from_erp()
        dept = Department.objects.get(erp_id='PMO - K')
        self.assertEqual(dept.name, 'PMO')
        self.assertEqual(Department.objects.filter(erp_id='PMO - K').count(), 1)

    def test_skips_disabled_departments(self, mock_get_erp_data):
        mock_get_erp_data.return_value = [
            {'name': 'Disabled - K', 'department_name': 'Disabled', 'disabled': 1},
        ]
        pull_department_from_erp()
        self.assertFalse(Department.objects.filter(erp_id='Disabled - K').exists())

    def test_skips_all_departments_entry(self, mock_get_erp_data):
        mock_get_erp_data.return_value = [
            {'name': 'All Departments', 'department_name': 'All Departments', 'disabled': 0},
        ]
        pull_department_from_erp()
        self.assertFalse(Department.objects.filter(erp_id='All Departments').exists())

    def test_skips_empty_erp_id(self, mock_get_erp_data):
        mock_get_erp_data.return_value = [
            {'name': '', 'department_name': 'No ID', 'disabled': 0},
        ]
        pull_department_from_erp()
        self.assertFalse(Department.objects.filter(name='No ID').exists())

    def test_two_departments_with_same_display_name_share_group(self, mock_get_erp_data):
        mock_get_erp_data.return_value = [
            {'name': 'Accounts - K', 'department_name': 'Accounts', 'disabled': 0},
            {'name': 'Accounts - KE', 'department_name': 'Accounts', 'disabled': 0},
        ]
        pull_department_from_erp()
        self.assertEqual(Department.objects.count(), 2)
        from django.contrib.auth.models import Group
        self.assertEqual(Group.objects.filter(name='Accounts').count(), 1)


@patch('timesheet.utils.erp.get_erp_data')
class TestPullUserDataFromErp(TestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.user.profile.save()
        from django.contrib.auth.models import Group
        self.group = Group.objects.create(name='Engineering')
        self.department = Department.objects.create(
            erp_id='Engineering - K', name='Engineering', group=self.group
        )

    def _mock_employee(self, mock, **overrides):
        data = {
            'employee_name': 'Jane Doe',
            'employee': 'EMP001',
            'first_name': 'Jane',
            'last_name': 'Doe',
            'department': 'Engineering - K',
        }
        data.update(overrides)
        mock.return_value = [data]

    def test_updates_profile_fields(self, mock_get_erp_data):
        self._mock_employee(mock_get_erp_data)
        pull_user_data_from_erp(self.user)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.employee_name, 'Jane Doe')
        self.assertEqual(self.user.profile.employee_id, 'EMP001')

    def test_assigns_department_to_profile(self, mock_get_erp_data):
        self._mock_employee(mock_get_erp_data)
        pull_user_data_from_erp(self.user)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.department, self.department)

    def test_adds_user_to_department_group(self, mock_get_erp_data):
        self._mock_employee(mock_get_erp_data)
        pull_user_data_from_erp(self.user)
        self.assertIn(self.group, self.user.groups.all())

    def test_unknown_department_leaves_profile_unchanged(self, mock_get_erp_data):
        self._mock_employee(mock_get_erp_data, department='Unknown - K')
        original_dept = self.user.profile.department
        pull_user_data_from_erp(self.user)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.department, original_dept)

    def test_empty_department_skips_assignment(self, mock_get_erp_data):
        self._mock_employee(mock_get_erp_data, department='')
        pull_user_data_from_erp(self.user)
        self.user.profile.refresh_from_db()
        self.assertIsNone(self.user.profile.department)
        self.assertNotIn(self.group, self.user.groups.all())

    def test_no_employee_record_does_nothing(self, mock_get_erp_data):
        mock_get_erp_data.return_value = []
        pull_user_data_from_erp(self.user)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.employee_name, '')

    def test_updates_user_name_fields(self, mock_get_erp_data):
        self._mock_employee(mock_get_erp_data, first_name='Jane', last_name='Doe')
        pull_user_data_from_erp(self.user)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'Jane')
        self.assertEqual(self.user.last_name, 'Doe')


class TestResolveIssueCustomer(TestCase):
    def test_project_customer_used_when_no_override(self):
        project = Project.objects.create(name='SLA Acme', customer='Acme Corp', project_type='EXTERNAL')
        customer, is_internal = _resolve_issue_customer(project, 'someone@acme.com')
        self.assertEqual(customer, 'Acme Corp')
        self.assertFalse(is_internal)

    def test_internal_project_type_is_internal_even_with_customer(self):
        project = Project.objects.create(name='Internal Tooling', customer='Kartoza', project_type='INTERNAL')
        customer, is_internal = _resolve_issue_customer(project, 'dev@kartoza.com')
        self.assertTrue(is_internal)

    def test_project_with_blank_customer_is_internal(self):
        project = Project.objects.create(name='No Customer Set', customer='', project_type='EXTERNAL')
        customer, is_internal = _resolve_issue_customer(project, 'someone@example.com')
        self.assertEqual(customer, '')
        self.assertTrue(is_internal)

    def test_project_name_override_takes_priority_over_project_customer(self):
        project = Project.objects.create(name='GSH Support', customer='Kartoza', project_type='EXTERNAL')
        SupportContactMapping.objects.create(project_name='GSH Support', customer='GSH')
        customer, is_internal = _resolve_issue_customer(project, 'someone@geonode-client.com')
        self.assertEqual(customer, 'GSH')
        self.assertFalse(is_internal)

    def test_email_exact_match_used_when_no_project(self):
        SupportContactMapping.objects.create(email='jane.doe@example.com', customer='Example Client Inc')
        customer, is_internal = _resolve_issue_customer(None, 'jane.doe@example.com')
        self.assertEqual(customer, 'Example Client Inc')
        self.assertFalse(is_internal)

    def test_email_match_is_case_insensitive(self):
        SupportContactMapping.objects.create(email='jane.doe@example.com', customer='Example Client Inc')
        customer, is_internal = _resolve_issue_customer(None, 'Jane.Doe@EXAMPLE.com')
        self.assertEqual(customer, 'Example Client Inc')
        self.assertFalse(is_internal)

    def test_domain_wildcard_used_when_no_exact_email_match(self):
        SupportContactMapping.objects.create(email='@kartoza.com', customer='')
        customer, is_internal = _resolve_issue_customer(None, 'newhire@kartoza.com')
        self.assertEqual(customer, '')
        self.assertTrue(is_internal)

    def test_mapping_with_blank_customer_is_internal(self):
        SupportContactMapping.objects.create(email='some.contact@example.com', customer='')
        customer, is_internal = _resolve_issue_customer(None, 'some.contact@example.com')
        self.assertEqual(customer, '')
        self.assertTrue(is_internal)

    def test_unknown_email_and_no_project_is_internal(self):
        customer, is_internal = _resolve_issue_customer(None, 'nobody-knows-this@example.com')
        self.assertEqual(customer, '')
        self.assertTrue(is_internal)

    def test_no_project_no_email_is_internal(self):
        customer, is_internal = _resolve_issue_customer(None, '')
        self.assertEqual(customer, '')
        self.assertTrue(is_internal)
