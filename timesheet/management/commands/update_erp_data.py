import logging
import time

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from timesheet.models.project import Project
from timesheet.models.project_member import ProjectMember
from timesheet.models.user_project import UserProject
from timesheet.utils.erp import (
    ProjectsNotFound,
    pull_department_from_erp,
    pull_holiday_list,
    pull_leave_data_from_erp,
    pull_project_members_from_erp,
    pull_projects_only_from_erp,
    pull_tasks_from_erp,
    pull_user_data_from_erp,
    update_schedule_countdown,
)

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = 'Sync data from ERPNext: PMO projects/tasks/members, then per-user leave/schedule/profile data.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            metavar='USERNAME',
            help='Django username whose ERPNext token to use for PMO sync. Defaults to the global ERPNEXT_TOKEN.',
        )

    def handle(self, *args, **options):
        pmo_user = self._resolve_user(options['user'])
        self._sync_pmo(pmo_user)
        self._sync_per_user()

    def _resolve_user(self, username):
        if not username:
            return None
        try:
            return User.objects.get(username=username)
        except User.DoesNotExist:
            raise CommandError(f'User "{username}" does not exist.')

    def _sync_pmo(self, user):
        self.stdout.write('── PMO sync ──────────────────────────────────────')
        t0 = time.perf_counter()

        try:
            updated_ids = pull_projects_only_from_erp(user, filters='[["status", "=", "Open"]]')
        except ProjectsNotFound:
            self.stdout.write(self.style.WARNING('No open projects returned from ERPNext — skipping PMO sync.'))
            return

        stale = Project.objects.filter(is_active=True).exclude(id__in=updated_ids).update(is_active=False)
        Project.objects.filter(id__in=updated_ids).update(last_synced_at=timezone.now())
        t1 = time.perf_counter()
        self.stdout.write(f'  projects   {len(updated_ids)} updated, {stale} deactivated  ({t1 - t0:.2f}s)')

        active_projects = list(Project.objects.filter(is_active=True))

        pull_tasks_from_erp(user, active_projects)
        t2 = time.perf_counter()
        self.stdout.write(f'  tasks      {t2 - t1:.2f}s')

        pull_project_members_from_erp(user, project_names=[p.name for p in active_projects])
        t3 = time.perf_counter()
        self.stdout.write(f'  members    {t3 - t2:.2f}s')

        self._sync_user_projects_from_members()
        t4 = time.perf_counter()
        self.stdout.write(f'  user_projects  {t4 - t3:.2f}s')

        self.stdout.write(self.style.SUCCESS(f'PMO sync done in {t4 - t0:.2f}s'))

    def _sync_user_projects_from_members(self):
        """Create UserProject records to mirror ProjectMember assignments."""
        created = 0
        for member in ProjectMember.objects.select_related('user', 'project').filter(user__isnull=False):
            _, was_created = UserProject.objects.get_or_create(
                user=member.user,
                project=member.project,
            )
            if was_created:
                created += 1
        if created:
            self.stdout.write(f'    created {created} new UserProject record(s) from member assignments')

    def _sync_per_user(self):
        self.stdout.write('── Per-user sync ─────────────────────────────────')
        users = User.objects.filter(is_active=True)
        department_synced = False

        for user in users:
            if not (user.profile.api_secret or user.profile.erpnext_oauth_token):
                continue

            self.stdout.write(f'  {user.username}')

            if not department_synced:
                pull_department_from_erp(user)
                department_synced = True

            pull_leave_data_from_erp(user)
            pull_holiday_list(user)
            update_schedule_countdown(user)
            pull_user_data_from_erp(user)

        self.stdout.write(self.style.SUCCESS('Per-user sync done'))
