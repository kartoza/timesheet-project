import datetime
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from timesheet.connections_puzzles import CONNECTIONS_PUZZLES
from timesheet.models import ConnectionsGame
from timesheet.utils.games import user_today

GROUPS = [
    {'category': 'Fruits', 'words': ['APPLE', 'MANGO', 'PEACH', 'LEMON']},
    {'category': 'Cars', 'words': ['TESLA', 'HONDA', 'MAZDA', 'AUDI']},
    {'category': 'Greek', 'words': ['ALPHA', 'DELTA', 'SIGMA', 'OMEGA']},
    {'category': 'Tech', 'words': ['ORACLE', 'ADOBE', 'META', 'INTEL']},
]


class TestPuzzles(TestCase):
    def test_every_puzzle_is_well_formed(self):
        for i, puzzle in enumerate(CONNECTIONS_PUZZLES):
            self.assertEqual(len(puzzle), 4, i)
            words = [w for _, group in puzzle for w in group]
            self.assertTrue(all(len(g) == 4 for _, g in puzzle), i)
            self.assertEqual(len(set(words)), 16, i)
            self.assertTrue(all(w == w.upper() for w in words), i)


class TestConnectionsViews(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('u1', password='pass')
        self.other = User.objects.create_user('u2', password='pass')
        self.other_client = APIClient()
        self.client.login(username='u1', password='pass')
        self.other_client.login(username='u2', password='pass')
        self.pick_url = reverse('connections-pick')

    def _game(self):
        self.client.get(reverse('connections-state'))
        game = ConnectionsGame.objects.get(is_finished=False)
        game.groups = GROUPS
        words = [w for g in GROUPS for w in g['words']]
        game.words_order = words
        game.save()
        return game

    def pick(self, client, words):
        return client.post(self.pick_url, {'words': words}, format='json')

    def test_state_hides_the_groups(self):
        response = self.client.get(reverse('connections-state'))
        data = response.json()
        self.assertEqual(len(data['words']), 16)
        self.assertEqual(data['solved'], [])
        self.assertNotIn('groups', data)

    def test_correct_group_gives_a_point_and_removes_words(self):
        self._game()
        response = self.pick(self.client, ['apple', 'mango', 'peach', 'lemon'])
        data = response.json()
        self.assertEqual(data['result'], 'correct')
        self.assertEqual(data['solved'][0]['category'], 'Fruits')
        self.assertEqual(len(data['words']), 12)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.points, 1)

    def test_wrong_pick_and_one_away(self):
        self._game()
        one_away = self.pick(self.client, ['APPLE', 'MANGO', 'PEACH', 'TESLA'])
        self.assertEqual(one_away.json()['result'], 'one_away')
        wrong = self.pick(self.other_client, ['APPLE', 'TESLA', 'ALPHA', 'META'])
        self.assertEqual(wrong.json()['result'], 'wrong')
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.points, 0)
        self.assertEqual(len(wrong.json()['attempts']), 2)

    def test_one_pick_per_day_then_again_next_day(self):
        self._game()
        self.pick(self.client, ['APPLE', 'TESLA', 'ALPHA', 'META'])
        again = self.pick(self.client, ['APPLE', 'MANGO', 'PEACH', 'LEMON'])
        self.assertEqual(again.status_code, 400)
        tomorrow = user_today(self.user) + datetime.timedelta(days=1)
        with patch('timesheet.api_views.connections.user_today',
                   return_value=tomorrow):
            third = self.pick(self.client, ['APPLE', 'MANGO', 'PEACH', 'LEMON'])
        self.assertEqual(third.status_code, 200)
        self.assertEqual(third.json()['result'], 'correct')

    def test_solved_words_cannot_be_picked_again(self):
        self._game()
        self.pick(self.client, ['APPLE', 'MANGO', 'PEACH', 'LEMON'])
        response = self.pick(
            self.other_client, ['APPLE', 'MANGO', 'PEACH', 'LEMON'])
        self.assertEqual(response.status_code, 400)

    def test_invalid_picks(self):
        self._game()
        self.assertEqual(self.pick(self.client, ['APPLE']).status_code, 400)
        self.assertEqual(
            self.pick(self.client, ['APPLE', 'APPLE', 'MANGO', 'PEACH'])
            .status_code, 400)
        self.assertEqual(
            self.pick(self.client, ['APPLE', 'MANGO', 'PEACH', 'NOPE'])
            .status_code, 400)

    def test_finishing_the_puzzle_waits_until_tomorrow(self):
        game = self._game()
        users = [self.user] + [
            User.objects.create_user(f'x{i}', password='pass')
            for i in range(3)
        ]
        for user, group in zip(users, GROUPS):
            client = APIClient()
            client.login(username=user.username, password='pass')
            data = self.pick(client, group['words']).json()
        self.assertFalse(data['next']['active'])
        game.refresh_from_db()
        self.assertTrue(game.is_finished)
        state = self.client.get(reverse('connections-state')).json()
        self.assertFalse(state['active'])
        self.assertEqual(len(state['solved']), 4)
        self.assertEqual(ConnectionsGame.objects.count(), 1)
        # A new puzzle starts the next day.
        game.finished_at = timezone.now() - datetime.timedelta(days=1)
        game.save()
        state = self.client.get(reverse('connections-state')).json()
        self.assertTrue(state['active'])
        self.assertEqual(ConnectionsGame.objects.count(), 2)

    def test_admin_hides_the_groups_until_finished(self):
        User.objects.create_superuser('root', 'r@x.org', 'pass')
        client = APIClient()
        client.login(username='root', password='pass')
        game = self._game()
        url = reverse('admin:timesheet_connectionsgame_change', args=[game.pk])
        self.assertNotContains(client.get(url), 'Fruits')
        self.assertNotContains(
            client.get(reverse('admin:timesheet_connectionsgame_changelist')),
            'Fruits')
        game.is_finished = True
        game.save()
        self.assertContains(client.get(url), 'Fruits')


class TestGamesStatus(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('u1', password='pass')
        self.client.login(username='u1', password='pass')

    def status(self):
        data = self.client.get(reverse('games-status')).json()
        return {g['key']: g for g in data['games']}

    def test_reports_whether_each_game_was_played_today(self):
        games = self.status()
        self.assertFalse(games['wordle']['played_today'])
        self.assertFalse(games['connections']['played_today'])

        from timesheet.models import WordleGame
        wordle = WordleGame.objects.get(is_finished=False)
        wordle.word = 'SOFTWARE'
        wordle.save()
        self.client.post(
            reverse('wordle-guess'), {'guess': 'standard'}, format='json')
        games = self.status()
        self.assertTrue(games['wordle']['played_today'])
        self.assertFalse(games['connections']['played_today'])

        game = ConnectionsGame.objects.get(is_finished=False)
        game.groups = GROUPS
        game.words_order = [w for g in GROUPS for w in g['words']]
        game.save()
        self.client.post(
            reverse('connections-pick'),
            {'words': ['APPLE', 'TESLA', 'ALPHA', 'META']}, format='json')
        self.assertTrue(self.status()['connections']['played_today'])

    def test_includes_the_leaderboard_ranked_by_points(self):
        other = User.objects.create_user('u2', first_name='Sam', password='pass')
        User.objects.filter(pk=self.user.pk).update(first_name='Alex')
        self.user.profile.points = 2
        self.user.profile.save()
        other.profile.points = 5
        other.profile.save()
        data = self.client.get(reverse('games-status')).json()
        self.assertEqual(
            data['leaderboard'],
            [
                {'rank': 1, 'user': 'Sam', 'points': 5, 'is_me': False},
                {'rank': 2, 'user': 'Alex', 'points': 2, 'is_me': True},
            ])
        self.assertEqual(data['points'], 2)
        self.assertEqual(data['rank'], 2)

    def test_requires_login(self):
        response = APIClient().get(reverse('games-status'))
        self.assertIn(response.status_code, (401, 403))
