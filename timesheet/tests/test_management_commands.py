from unittest.mock import call, patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from timesheet.models.project import Project
from timesheet.models.project_member import ProjectMember
from timesheet.models.user_project import UserProject
from timesheet.utils.erp import ProjectsNotFound

User = get_user_model()

MODULE = 'timesheet.management.commands.update_erp_data'

PATCHED = {
    'pull_projects_only': f'{MODULE}.pull_projects_only_from_erp',
    'pull_tasks':         f'{MODULE}.pull_tasks_from_erp',
    'pull_members':       f'{MODULE}.pull_project_members_from_erp',
    'pull_leave':         f'{MODULE}.pull_leave_data_from_erp',
    'pull_holiday':       f'{MODULE}.pull_holiday_list',
    'update_schedule':    f'{MODULE}.update_schedule_countdown',
    'pull_department':    f'{MODULE}.pull_department_from_erp',
    'pull_user_data':     f'{MODULE}.pull_user_data_from_erp',
}


def _make_user(username, email, api_secret='', oauth_token='', is_active=True):
    user = User.objects.create_user(username=username, email=email, is_active=is_active)
    user.profile.api_secret = api_secret
    user.profile.erpnext_oauth_access_token = oauth_token
    user.profile.save()
    return user


def _all_pmo_patches():
    """Decorator stack that patches all three PMO sync functions."""
    def decorator(fn):
        for key in ('pull_user_data', 'pull_department', 'update_schedule',
                    'pull_holiday', 'pull_leave', 'pull_members', 'pull_tasks'):
            fn = patch(PATCHED[key])(fn)
        fn = patch(PATCHED['pull_projects_only'], return_value=[])(fn)
        return fn
    return decorator


# ── PMO sync ──────────────────────────────────────────────────────────────────

class TestPMOSync(TestCase):

    def _run(self, **kwargs):
        """Run command with all ERP calls mocked; return the mock objects."""
        with patch(PATCHED['pull_projects_only'], return_value=[]) as mp, \
             patch(PATCHED['pull_tasks']) as mt, \
             patch(PATCHED['pull_members']) as mm, \
             patch(PATCHED['pull_leave']), \
             patch(PATCHED['pull_holiday']), \
             patch(PATCHED['update_schedule']), \
             patch(PATCHED['pull_department']), \
             patch(PATCHED['pull_user_data']):
            call_command('update_erp_data', **kwargs)
            return mp, mt, mm

    def test_pmo_sync_uses_global_token_by_default(self):
        mp, mt, mm = self._run()
        mp.assert_called_once_with(None, filters='[["status", "=", "Open"]]')

    def test_pmo_sync_uses_specified_user(self):
        user = _make_user('pmgr', 'pmgr@example.com', api_secret='s')
        mp, mt, mm = self._run(user='pmgr')
        mp.assert_called_once_with(user, filters='[["status", "=", "Open"]]')

    def test_invalid_user_raises_command_error(self):
        with self.assertRaises(CommandError):
            call_command('update_erp_data', user='nobody')

    def test_no_open_projects_skips_tasks_and_members(self):
        with patch(PATCHED['pull_projects_only'], side_effect=ProjectsNotFound), \
             patch(PATCHED['pull_tasks']) as mt, \
             patch(PATCHED['pull_members']) as mm, \
             patch(PATCHED['pull_leave']), patch(PATCHED['pull_holiday']), \
             patch(PATCHED['update_schedule']), patch(PATCHED['pull_department']), \
             patch(PATCHED['pull_user_data']):
            call_command('update_erp_data')
        mt.assert_not_called()
        mm.assert_not_called()

    def test_stale_projects_marked_inactive(self):
        kept = Project.objects.create(name='Kept', is_active=True)
        stale = Project.objects.create(name='Stale', is_active=True)
        with patch(PATCHED['pull_projects_only'], return_value=[kept.id]), \
             patch(PATCHED['pull_tasks']), patch(PATCHED['pull_members']), \
             patch(PATCHED['pull_leave']), patch(PATCHED['pull_holiday']), \
             patch(PATCHED['update_schedule']), patch(PATCHED['pull_department']), \
             patch(PATCHED['pull_user_data']):
            call_command('update_erp_data')
        stale.refresh_from_db()
        kept.refresh_from_db()
        self.assertFalse(stale.is_active)
        self.assertTrue(kept.is_active)

    def test_tasks_and_members_called_with_active_projects(self):
        project = Project.objects.create(name='Active', is_active=True)
        with patch(PATCHED['pull_projects_only'], return_value=[project.id]) as mp, \
             patch(PATCHED['pull_tasks']) as mt, \
             patch(PATCHED['pull_members']) as mm, \
             patch(PATCHED['pull_leave']), patch(PATCHED['pull_holiday']), \
             patch(PATCHED['update_schedule']), patch(PATCHED['pull_department']), \
             patch(PATCHED['pull_user_data']):
            call_command('update_erp_data')
        mt.assert_called_once()
        mm.assert_called_once()
        _, mt_kwargs = mt.call_args
        passed_projects = mt.call_args[0][1]
        self.assertIn(project, passed_projects)


# ── UserProject sync from members ─────────────────────────────────────────────

class TestUserProjectSync(TestCase):

    def test_user_projects_created_from_project_members(self):
        project = Project.objects.create(name='MP', is_active=True)
        member_user = _make_user('member', 'member@example.com')
        ProjectMember.objects.create(project=project, user=member_user, role='Dev')

        with patch(PATCHED['pull_projects_only'], return_value=[project.id]), \
             patch(PATCHED['pull_tasks']), patch(PATCHED['pull_members']), \
             patch(PATCHED['pull_leave']), patch(PATCHED['pull_holiday']), \
             patch(PATCHED['update_schedule']), patch(PATCHED['pull_department']), \
             patch(PATCHED['pull_user_data']):
            call_command('update_erp_data')

        self.assertTrue(UserProject.objects.filter(user=member_user, project=project).exists())

    def test_user_projects_not_duplicated_on_rerun(self):
        project = Project.objects.create(name='MP2', is_active=True)
        member_user = _make_user('member2', 'member2@example.com')
        ProjectMember.objects.create(project=project, user=member_user, role='Dev')
        UserProject.objects.create(user=member_user, project=project)

        with patch(PATCHED['pull_projects_only'], return_value=[project.id]), \
             patch(PATCHED['pull_tasks']), patch(PATCHED['pull_members']), \
             patch(PATCHED['pull_leave']), patch(PATCHED['pull_holiday']), \
             patch(PATCHED['update_schedule']), patch(PATCHED['pull_department']), \
             patch(PATCHED['pull_user_data']):
            call_command('update_erp_data')

        self.assertEqual(UserProject.objects.filter(user=member_user, project=project).count(), 1)


# ── Per-user sync ─────────────────────────────────────────────────────────────

class TestPerUserSync(TestCase):

    def _run_with_user(self, user):
        with patch(PATCHED['pull_projects_only'], return_value=[]), \
             patch(PATCHED['pull_tasks']), patch(PATCHED['pull_members']), \
             patch(PATCHED['pull_leave']) as ml, \
             patch(PATCHED['pull_holiday']) as mh, \
             patch(PATCHED['update_schedule']) as ms, \
             patch(PATCHED['pull_department']) as md, \
             patch(PATCHED['pull_user_data']) as mu:
            call_command('update_erp_data')
            return ml, mh, ms, md, mu

    def test_users_without_credentials_skipped(self):
        _make_user('plain', 'plain@example.com')
        ml, mh, ms, md, mu = self._run_with_user(None)
        ml.assert_not_called()
        mu.assert_not_called()

    def test_inactive_users_skipped(self):
        _make_user('inactive', 'i@example.com', api_secret='s', is_active=False)
        ml, mh, ms, md, mu = self._run_with_user(None)
        ml.assert_not_called()

    def test_api_secret_user_triggers_per_user_sync(self):
        user = _make_user('u1', 'u1@example.com', api_secret='secret')
        ml, mh, ms, md, mu = self._run_with_user(user)
        ml.assert_called_once_with(user)
        mh.assert_called_once_with(user)
        ms.assert_called_once_with(user)
        mu.assert_called_once_with(user)

    def test_oauth_token_user_triggers_per_user_sync(self):
        user = _make_user('oauth', 'oauth@example.com', oauth_token='tok123')
        ml, mh, ms, md, mu = self._run_with_user(user)
        ml.assert_called_once_with(user)

    def test_department_synced_only_once_for_multiple_users(self):
        _make_user('u1', 'u1@example.com', api_secret='s1')
        _make_user('u2', 'u2@example.com', api_secret='s2')
        _, _, _, md, _ = self._run_with_user(None)
        self.assertEqual(md.call_count, 1)

    def test_per_user_functions_called_for_each_credentialed_user(self):
        _make_user('u1', 'u1@example.com', api_secret='s1')
        _make_user('u2', 'u2@example.com', api_secret='s2')
        ml, _, _, _, _ = self._run_with_user(None)
        self.assertEqual(ml.call_count, 2)
