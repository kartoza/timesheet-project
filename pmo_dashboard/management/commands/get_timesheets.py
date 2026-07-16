import logging

from django.core.management.base import BaseCommand, CommandError

from pmo_dashboard.billable_sync import fetch_and_save_billable_hours

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Fetch per-task timesheet hours from ERPNext, save to DB, and display summary'

    def add_arguments(self, parser):
        parser.add_argument(
            'project_name',
            type=str,
            help='ERPNext project name (exact)',
        )
        parser.add_argument(
            '--from',
            dest='date_from',
            default=None,
            metavar='YYYY-MM-DD',
            help='Only include entries from this date onwards',
        )
        parser.add_argument(
            '--to',
            dest='date_to',
            default=None,
            metavar='YYYY-MM-DD',
            help='Only include entries up to this date',
        )

    def handle(self, *args, **options):
        from django.utils import timezone
        now = timezone.now()
        project_name = options['project_name']
        date_from = options['date_from']
        date_to = options['date_to']

        self.stdout.write(f'Fetching timesheets for: {project_name}')
        if date_from or date_to:
            self.stdout.write(f'Date range: {date_from or "..."} -> {date_to or "..."}')

        tasks = fetch_and_save_billable_hours(project_name, date_from, date_to)

        if not tasks:
            raise CommandError(f'No timesheet data found for "{project_name}"')

        col = {'name': 32, 'budget': 10, 'consumed': 10, 'billable': 10, 'left': 10}
        header = (
            f'  {"Task":<{col["name"]}} {"Budget":>{col["budget"]}} '
            f'{"Consumed":>{col["consumed"]}} {"Billable":>{col["billable"]}} '
            f'{"Left":>{col["left"]}}'
        )
        sep = '  ' + '-' * (sum(col.values()) + len(col) - 1)

        self.stdout.write('')
        self.stdout.write(header)
        self.stdout.write(sep)

        total_budget = total_consumed = total_billable = total_left = 0.0

        for t in tasks:
            name = t['name'][:col['name']]
            left_str = f'{t["left"]:+.2f}h'
            self.stdout.write(
                f'  {name:<{col["name"]}} {t["budget"]:>{col["budget"]}.2f}h '
                f'{t["consumed"]:>{col["consumed"]}.2f}h {t["billable"]:>{col["billable"]}.2f}h '
                f'{left_str:>{col["left"]}}'
            )
            total_budget += t['budget']
            total_consumed += t['consumed']
            total_billable += t['billable']
            total_left += t['left']

        self.stdout.write(sep)
        self.stdout.write(
            f'  {"TOTAL":<{col["name"]}} {total_budget:>{col["budget"]}.2f}h '
            f'{total_consumed:>{col["consumed"]}.2f}h {total_billable:>{col["billable"]}.2f}h '
            f'{total_left:>+{col["left"]}.2f}h'
        )

        self.stdout.write('')
        saved = sum(1 for t in tasks if t['name'] != t['erp_id'])
        self.stdout.write(self.style.SUCCESS(f'Saved billable_hours to DB for {saved} task(s).'))
        end = timezone.now()
        delta = end - now
        print(delta)

