from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

User = get_user_model()

PATCHED = {
    'pull_projects': 'timesheet.management.commands.update_erp_data.pull_projects_from_erp',
    'pull_members': 'timesheet.management.commands.update_erp_data.pull_project_members_from_erp',
    'pull_leave': 'timesheet.management.commands.update_erp_data.pull_leave_data_from_erp',
    'pull_holiday': 'timesheet.management.commands.update_erp_data.pull_holiday_list',
    'update_schedule': 'timesheet.management.commands.update_erp_data.update_schedule_countdown',
    'pull_department': 'timesheet.management.commands.update_erp_data.pull_department_from_erp',
    'pull_user_data': 'timesheet.management.commands.update_erp_data.pull_user_data_from_erp',
}


def _make_user(username, email, api_secret='', oauth_token=''):
    user = User.objects.create_user(username=username, email=email, is_active=True)
    user.profile.api_secret = api_secret
    user.profile.erpnext_oauth_access_token = oauth_token
    user.profile.save()
    return user


class TestUpdateErpDataCommand(TestCase):
    @patch(PATCHED['pull_user_data'])
    @patch(PATCHED['pull_department'])
    @patch(PATCHED['update_schedule'])
    @patch(PATCHED['pull_holiday'])
    @patch(PATCHED['pull_leave'])
    @patch(PATCHED['pull_members'])
    @patch(PATCHED['pull_projects'])
    def test_no_credentialed_users_skips_all_pulls(
        self, mock_projects, mock_members, *_
    ):
        User.objects.create_user(username='plain', email='plain@example.com', is_active=True)
        call_command('update_erp_data')
        mock_projects.assert_not_called()
        mock_members.assert_not_called()

    @patch(PATCHED['pull_user_data'])
    @patch(PATCHED['pull_department'])
    @patch(PATCHED['update_schedule'])
    @patch(PATCHED['pull_holiday'])
    @patch(PATCHED['pull_leave'])
    @patch(PATCHED['pull_members'])
    @patch(PATCHED['pull_projects'])
    def test_credentialed_user_triggers_project_and_member_pull(
        self, mock_projects, mock_members, *_
    ):
        user = _make_user('creduser', 'zakki@kartoza.com', api_secret='secret')
        call_command('update_erp_data')
        mock_projects.assert_called_once_with(user)
        mock_members.assert_called_once_with(user)

    @patch(PATCHED['pull_user_data'])
    @patch(PATCHED['pull_department'])
    @patch(PATCHED['update_schedule'])
    @patch(PATCHED['pull_holiday'])
    @patch(PATCHED['pull_leave'])
    @patch(PATCHED['pull_members'])
    @patch(PATCHED['pull_projects'])
    def test_inactive_users_ignored(
        self, mock_projects, mock_members, *_
    ):
        User.objects.create_user(
            username='inactive', email='inactive@example.com', is_active=False
        )
        call_command('update_erp_data')
        mock_projects.assert_not_called()
        mock_members.assert_not_called()

    @patch(PATCHED['pull_user_data'])
    @patch(PATCHED['pull_department'])
    @patch(PATCHED['update_schedule'])
    @patch(PATCHED['pull_holiday'])
    @patch(PATCHED['pull_leave'])
    @patch(PATCHED['pull_members'])
    @patch(PATCHED['pull_projects'])
    def test_pull_members_called_once_regardless_of_user_count(
        self, _projects, mock_members, *_
    ):
        _make_user('u1', 'zakki@kartoza.com', api_secret='s1')
        call_command('update_erp_data')
        self.assertEqual(mock_members.call_count, 1)

    @patch(PATCHED['pull_user_data'])
    @patch(PATCHED['pull_department'])
    @patch(PATCHED['update_schedule'])
    @patch(PATCHED['pull_holiday'])
    @patch(PATCHED['pull_leave'])
    @patch(PATCHED['pull_members'])
    @patch(PATCHED['pull_projects'])
    def test_oauth_token_user_is_also_credentialed(
        self, mock_projects, mock_members, *_
    ):
        user = _make_user('oauthuser', 'zakki@kartoza.com', oauth_token='tok123')
        call_command('update_erp_data')
        mock_projects.assert_called_once_with(user)
        mock_members.assert_called_once()
