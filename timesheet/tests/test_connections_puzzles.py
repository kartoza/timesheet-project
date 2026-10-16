
import tempfile
from io import StringIO

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from timesheet.models import ConnectionsGame, ConnectionsPuzzle
from timesheet.utils.connections import (
    CSV_COLUMNS, clean_groups, parse_puzzles_csv, puzzles_to_csv
)

GROUPS = [
    {'category': 'Fruits', 'words': ['APPLE', 'MANGO', 'PEACH', 'LEMON']},
    {'category': 'Cars', 'words': ['TESLA', 'HONDA', 'MAZDA', 'AUDI']},
    {'category': 'Greek', 'words': ['ALPHA', 'DELTA', 'SIGMA', 'OMEGA']},
    {'category': 'Tech', 'words': ['ORACLE', 'ADOBE', 'META', 'INTEL']},
]


class TestCleanGroups(TestCase):
    def test_normalises_words(self):
        groups = [dict(g, words=[w.lower() for w in g['words']]) for g in GROUPS]
        self.assertEqual(clean_groups(groups), GROUPS)

    def test_rejects_unplayable_puzzles(self):
        bad_cases = {
            'three groups': GROUPS[:3],
            'three words': GROUPS[:3] + [{'category': 'X', 'words': ['A1B', 'CD', 'EF']}],
            'duplicate word': GROUPS[:3] + [
                {'category': 'Tech', 'words': ['APPLE', 'ADOBE', 'META', 'INTEL']}],
            'not a word': GROUPS[:3] + [
                {'category': 'Tech', 'words': ['NEW YORK', 'ADOBE', 'META', 'INTEL']}],
            'no category': GROUPS[:3] + [
                {'category': ' ', 'words': ['ORACLE', 'ADOBE', 'META', 'INTEL']}],
        }
        for name, groups in bad_cases.items():
            with self.subTest(name), self.assertRaises(ValueError):
                clean_groups(groups)


class TestPuzzleSelection(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('u1', password='pass')
        self.client.login(username='u1', password='pass')

    def test_starter_puzzles_were_imported_as_approved(self):
        self.assertEqual(
            ConnectionsPuzzle.objects.filter(
                status='approved', source='imported').count(), 20)

    def test_only_approved_puzzles_are_played(self):
        ConnectionsPuzzle.objects.update(status='archived')
        approved = ConnectionsPuzzle.objects.create(
            groups=GROUPS, status='approved')
        ConnectionsPuzzle.objects.create(groups=GROUPS, status='draft')
        state = self.client.get(reverse('connections-state')).json()
        self.assertTrue(state['active'])
        game = ConnectionsGame.objects.get()
        self.assertEqual(game.puzzle, approved)
        self.assertEqual(game.groups, GROUPS)

    def test_running_game_keeps_its_groups_when_the_puzzle_is_edited(self):
        ConnectionsPuzzle.objects.update(status='archived')
        puzzle = ConnectionsPuzzle.objects.create(groups=GROUPS, status='approved')
        self.client.get(reverse('connections-state'))
        puzzle.groups = [dict(g, category='Changed') for g in GROUPS]
        puzzle.save()
        self.assertEqual(ConnectionsGame.objects.get().groups, GROUPS)

    def test_no_approved_puzzle_means_unavailable(self):
        ConnectionsPuzzle.objects.update(status='archived')
        state = self.client.get(reverse('connections-state')).json()
        self.assertFalse(state['active'])
        self.assertTrue(state['unavailable'])
        pick = self.client.post(
            reverse('connections-pick'),
            {'words': ['APPLE', 'MANGO', 'PEACH', 'LEMON']}, format='json')
        self.assertEqual(pick.status_code, 400)
        games = {
            g['key']: g for g in
            self.client.get(reverse('games-status')).json()['games']
        }
        self.assertTrue(games['connections']['unavailable'])
        self.assertFalse(games['connections']['solved'])

    def test_recent_puzzles_are_not_repeated_while_others_exist(self):
        ConnectionsPuzzle.objects.update(status='archived')
        first = ConnectionsPuzzle.objects.create(groups=GROUPS, status='approved')
        second = ConnectionsPuzzle.objects.create(groups=GROUPS, status='approved')
        self.client.get(reverse('connections-state'))
        game = ConnectionsGame.objects.get()
        game.is_finished = True
        game.save()
        from timesheet.api_views.connections import create_game
        self.assertNotEqual(create_game().puzzle, game.puzzle)


class TestPuzzleAdmin(TestCase):
    def setUp(self):
        User.objects.create_superuser('root', 'r@x.org', 'pass')
        self.client = APIClient()
        self.client.login(username='root', password='pass')

    def form_data(self, **overrides):
        data = {'status': 'draft'}
        for i, group in enumerate(GROUPS):
            data[f'category_{i}'] = group['category']
            data[f'words_{i}'] = ', '.join(group['words'])
        data.update(overrides)
        return data

    def test_add_a_puzzle(self):
        response = self.client.post(
            reverse('admin:timesheet_connectionspuzzle_add'),
            self.form_data(words_0='apple, mango, peach, lemon'))
        self.assertEqual(response.status_code, 302)
        puzzle = ConnectionsPuzzle.objects.first()
        self.assertEqual(puzzle.groups, GROUPS)
        self.assertEqual(puzzle.source, 'manual')

    def test_invalid_puzzle_is_rejected_with_a_message(self):
        response = self.client.post(
            reverse('admin:timesheet_connectionspuzzle_add'),
            self.form_data(words_0='APPLE, MANGO, PEACH'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'exactly 4 words')
        self.assertFalse(
            ConnectionsPuzzle.objects.filter(groups=GROUPS).exists())

    def test_approve_action(self):
        puzzle = ConnectionsPuzzle.objects.create(groups=GROUPS, status='draft')
        self.client.post(
            reverse('admin:timesheet_connectionspuzzle_changelist'),
            {'action': 'approve_puzzles', '_selected_action': [puzzle.pk]})
        puzzle.refresh_from_db()
        self.assertEqual(puzzle.status, 'approved')

    def test_edit_page_shows_the_existing_groups(self):
        puzzle = ConnectionsPuzzle.objects.create(groups=GROUPS, status='draft')
        response = self.client.get(reverse(
            'admin:timesheet_connectionspuzzle_change', args=[puzzle.pk]))
        self.assertContains(response, 'APPLE, MANGO, PEACH, LEMON')


HEADER = ','.join(CSV_COLUMNS)
GOOD_ROW = (
    'Fruits,APPLE|MANGO|PEACH|LEMON,Cars,TESLA|HONDA|MAZDA|AUDI,'
    'Greek,ALPHA|DELTA|SIGMA|OMEGA,Tech,ORACLE|ADOBE|META|INTEL'
)
OTHER_ROW = (
    'Birds,RAVEN|EAGLE|ROBIN|FALCON,Planets,VENUS|SATURN|EARTH|MERCURY,'
    'Metals,IRON|GOLD|ZINC|LEAD,Snakes,COBRA|VIPER|ADDER|MAMBA'
)


class TestPuzzlesCsv(TestCase):
    def test_parse_a_valid_file(self):
        puzzles, errors = parse_puzzles_csv(f'{HEADER}\n{GOOD_ROW}\n{OTHER_ROW}\n')
        self.assertEqual(errors, [])
        self.assertEqual([row for row, _ in puzzles], [2, 3])
        self.assertEqual(puzzles[0][1], GROUPS)

    def test_bom_blank_rows_and_lowercase_are_tolerated(self):
        text = '\ufeff' + HEADER + '\n,,,,,,,\n' + GOOD_ROW.lower().replace(
            'fruits', 'Fruits').replace('cars', 'Cars').replace(
            'greek', 'Greek').replace('tech', 'Tech') + '\n'
        puzzles, errors = parse_puzzles_csv(text)
        self.assertEqual(errors, [])
        self.assertEqual(len(puzzles), 1)

    def test_missing_columns(self):
        puzzles, errors = parse_puzzles_csv('category_1,words_1\nA,B|C|D|E\n')
        self.assertEqual(puzzles, [])
        self.assertIn('Missing column', errors[0])

    def test_bad_and_duplicate_rows_are_reported_with_row_numbers(self):
        bad = 'Fruits,APPLE|MANGO|PEACH,Cars,TESLA|HONDA|MAZDA|AUDI,Greek,ALPHA|DELTA|SIGMA|OMEGA,Tech,ORACLE|ADOBE|META|INTEL'
        puzzles, errors = parse_puzzles_csv(
            f'{HEADER}\n{GOOD_ROW}\n{bad}\n{GOOD_ROW}\n')
        self.assertEqual(len(puzzles), 1)
        self.assertIn('Row 3', errors[0])
        self.assertIn('exactly 4 words', errors[0])
        self.assertIn('Row 4', errors[1])
        self.assertIn('row 2', errors[1])

    def test_round_trip(self):
        puzzles, _ = parse_puzzles_csv(puzzles_to_csv([GROUPS]))
        self.assertEqual(puzzles[0][1], GROUPS)


class TestPuzzleCsvAdmin(TestCase):
    def setUp(self):
        User.objects.create_superuser('root', 'r@x.org', 'pass')
        self.client = APIClient()
        self.client.login(username='root', password='pass')
        ConnectionsPuzzle.objects.all().delete()
        self.import_url = reverse('admin:timesheet_connectionspuzzle_import_csv')

    def upload(self, text, **extra):
        file = SimpleUploadedFile('p.csv', text.encode(), content_type='text/csv')
        return self.client.post(
            self.import_url, {'csv_file': file, **extra}, follow=True)

    def test_import_creates_drafts(self):
        response = self.upload(f'{HEADER}\n{GOOD_ROW}\n{OTHER_ROW}\n')
        self.assertContains(response, '2 puzzle(s) imported as draft')
        self.assertEqual(ConnectionsPuzzle.objects.filter(status='draft').count(), 2)
        self.assertEqual(ConnectionsPuzzle.objects.first().source, 'imported')

    def test_import_can_approve_right_away(self):
        self.upload(f'{HEADER}\n{GOOD_ROW}\n', approve='on')
        self.assertEqual(ConnectionsPuzzle.objects.get().status, 'approved')

    def test_existing_and_invalid_rows_are_skipped_and_reported(self):
        ConnectionsPuzzle.objects.create(groups=GROUPS, status='approved')
        bad = 'x,A|B|C|D,y,E|F|G|H,z,I|J|K|L,w,M|N|O'
        response = self.upload(f'{HEADER}\n{GOOD_ROW}\n{OTHER_ROW}\n{bad}\n')
        self.assertContains(response, '1 puzzle(s) imported')
        self.assertContains(response, 'Row 2: this puzzle already exists.')
        self.assertContains(response, 'Row 4')
        self.assertEqual(ConnectionsPuzzle.objects.count(), 2)

    def test_wrong_file_is_reported_and_nothing_imported(self):
        response = self.upload('a,b\n1,2\n')
        self.assertContains(response, 'Missing column')
        self.assertEqual(ConnectionsPuzzle.objects.count(), 0)

    def test_pages_render_and_export_works(self):
        ConnectionsPuzzle.objects.create(groups=GROUPS, status='approved')
        self.assertContains(self.client.get(self.import_url), 'category_1')
        changelist = self.client.get(
            reverse('admin:timesheet_connectionspuzzle_changelist'))
        self.assertContains(changelist, 'Import CSV')
        export = self.client.get(
            reverse('admin:timesheet_connectionspuzzle_export_csv'))
        self.assertEqual(export['Content-Type'], 'text/csv')
        self.assertEqual(
            parse_puzzles_csv(export.content.decode())[0][0][1], GROUPS)

    def test_staff_without_permission_cannot_import(self):
        User.objects.create_user('staff', password='pass', is_staff=True)
        client = APIClient()
        client.login(username='staff', password='pass')
        self.assertEqual(client.get(self.import_url).status_code, 403)


class TestCheckCsvCommand(TestCase):
    def check(self, text):
        with tempfile.NamedTemporaryFile('w', suffix='.csv', delete=False) as f:
            f.write(text)
        out = StringIO()
        call_command('check_connections_csv', f.name, stdout=out, stderr=StringIO())
        return out.getvalue()

    def test_valid_file(self):
        self.assertIn('2 valid puzzle(s), 0 problem(s)',
                      self.check(f'{HEADER}\n{GOOD_ROW}\n{OTHER_ROW}\n'))

    def test_invalid_file_fails(self):
        with self.assertRaises(CommandError):
            self.check(f'{HEADER}\nonly,one\n')
