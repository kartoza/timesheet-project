from django.core.management.base import BaseCommand, CommandError

from timesheet.utils.connections import parse_puzzles_csv


class Command(BaseCommand):
    help = (
        'Check a Connections puzzles CSV file with the same rules as the '
        'admin import, without importing anything.'
    )

    def add_arguments(self, parser):
        parser.add_argument('path', help='Path to the CSV file.')

    def handle(self, *args, **options):
        try:
            with open(options['path'], encoding='utf-8') as f:
                text = f.read()
        except (OSError, UnicodeDecodeError) as error:
            raise CommandError(f'Cannot read the file: {error}')
        puzzles, errors = parse_puzzles_csv(text)
        for error in errors:
            self.stderr.write(error)
        self.stdout.write(f'{len(puzzles)} valid puzzle(s), {len(errors)} problem(s).')
        if errors:
            raise CommandError('Fix the problems above and check again.')
