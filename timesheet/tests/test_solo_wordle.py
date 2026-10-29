import datetime
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from timesheet.models import SoloWordleGame, WordleGame
from timesheet.utils.games import has_bonus_guess, is_leader, user_today


class TestSoloWordle(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('u1', password='pass')
        self.client.login(username='u1', password='pass')
        self.client.get(reverse('solo-wordle-state'))
        self.game = SoloWordleGame.objects.get()
        self.game.word = 'APPLE'
        self.game.save()
        self.url = reverse('solo-wordle-guess')

    def test_state_hides_word(self):
        state = self.client.get(reverse('solo-wordle-state')).json()
        self.assertIsNone(state['word'])
        self.assertEqual(state['word_length'], 5)

    def test_invalid_word_not_counted(self):
        response = self.client.post(self.url, {'guess': 'qqqqq'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.game.refresh_from_db()
        self.assertEqual(self.game.guesses, [])

    def test_win_gives_bonus_guess_and_no_points(self):
        data = self.client.post(self.url, {'guess': 'apple'}, format='json').json()
        self.assertTrue(data['won'])
        self.user.profile.refresh_from_db()
        self.assertTrue(has_bonus_guess(self.user))
        self.assertEqual(self.user.profile.points, 0)
        again = self.client.post(self.url, {'guess': 'apple'}, format='json')
        self.assertEqual(again.status_code, 400)

    def test_loss_after_six_guesses(self):
        for _ in range(6):
            data = self.client.post(self.url, {'guess': 'about'}, format='json').json()
        self.assertTrue(data['is_finished'])
        self.assertFalse(data['won'])
        self.assertEqual(data['word'], 'APPLE')
        self.assertFalse(has_bonus_guess(self.user))

    def test_bonus_allows_second_team_guess(self):
        self.client.post(self.url, {'guess': 'apple'}, format='json')
        self.client.get(reverse('wordle-state'))
        game = WordleGame.objects.get(is_finished=False)
        game.word = 'SOFTWARE'
        game.save()
        team = reverse('wordle-guess')
        self.assertEqual(
            self.client.post(team, {'guess': 'standard'}, format='json').status_code, 200)
        self.assertEqual(
            self.client.post(team, {'guess': 'solution'}, format='json').status_code, 200)
        self.assertEqual(
            self.client.post(team, {'guess': 'treasure'}, format='json').status_code, 400)

    def test_only_one_bonus_guess_used_per_day(self):
        self.game.won = True
        self.game.is_finished = True
        self.game.save()
        self.client.get(reverse('wordle-state'))
        game = WordleGame.objects.get(is_finished=False)
        game.word = 'SOFTWARE'
        game.save()
        team = reverse('wordle-guess')
        for guess, status in (('standard', 200), ('solution', 200), ('treasure', 400)):
            self.assertEqual(
                self.client.post(team, {'guess': guess}, format='json').status_code,
                status)
        self.assertTrue(self.client.get(reverse('wordle-state')).json()['has_guessed'])


class TestBonusGuessExpires(TestCase):
    def test_bonus_only_valid_on_the_day_it_was_won(self):
        user = User.objects.create_user('u2', password='pass')
        SoloWordleGame.objects.create(
            user=user, word='APPLE', play_date=user_today(user), won=True,
            is_finished=True)
        self.assertTrue(has_bonus_guess(user))
        tomorrow = user_today(user) + datetime.timedelta(days=1)
        with patch('timesheet.utils.games.user_today', return_value=tomorrow):
            self.assertFalse(has_bonus_guess(user))


class TestSoloWordleDailyWord(TestCase):
    def test_everyone_gets_the_same_word_each_day(self):
        for name in ('a', 'b'):
            user = User.objects.create_user(name, password='pass')
            client = APIClient()
            client.login(username=name, password='pass')
            client.get(reverse('solo-wordle-state'))
        words = set(SoloWordleGame.objects.values_list('word', flat=True))
        self.assertEqual(SoloWordleGame.objects.count(), 2)
        self.assertEqual(len(words), 1)


class TestLeaderGetsNoExtraGuess(TestCase):
    def setUp(self):
        self.leader = User.objects.create_user('leader', password='pass')
        self.second = User.objects.create_user('second', password='pass')
        self.set_points(self.leader, 10)
        self.set_points(self.second, 4)

    def set_points(self, user, points):
        user.profile.points = points
        user.profile.save()

    def win_solo(self, user):
        SoloWordleGame.objects.create(
            user=user, word='APPLE', play_date=user_today(user), won=True,
            is_finished=True)

    def client_for(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    def test_leader_gets_no_extra_guess_after_winning(self):
        self.win_solo(self.leader)
        self.win_solo(self.second)
        self.assertTrue(is_leader(self.leader))
        self.assertFalse(has_bonus_guess(self.leader))
        self.assertTrue(has_bonus_guess(self.second))

    def test_ties_for_first_place_all_miss_out(self):
        self.set_points(self.second, 10)
        for user in (self.leader, self.second):
            self.win_solo(user)
            self.assertFalse(has_bonus_guess(user))

    def test_nobody_leads_before_points_are_won(self):
        self.set_points(self.leader, 0)
        self.set_points(self.second, 0)
        self.win_solo(self.second)
        self.assertFalse(is_leader(self.second))
        self.assertTrue(has_bonus_guess(self.second))

    def test_losing_the_lead_gives_the_extra_guess_back(self):
        self.win_solo(self.leader)
        self.assertFalse(has_bonus_guess(self.leader))
        self.set_points(self.second, 20)
        self.assertTrue(has_bonus_guess(self.leader))

    def test_solo_state_and_hub_do_not_mention_the_extra_guess_for_the_leader(self):
        leader = self.client_for(self.leader)
        second = self.client_for(self.second)
        self.assertFalse(
            leader.get(reverse('solo-wordle-state')).json()['earns_extra_guess'])
        self.assertTrue(
            second.get(reverse('solo-wordle-state')).json()['earns_extra_guess'])

        def solo_description(client):
            games = client.get(reverse('games-status')).json()['games']
            return next(g for g in games if g['key'] == 'solo_wordle')['description']

        self.assertNotIn('extra', solo_description(leader))
        self.assertIn('extra', solo_description(second))

    def test_leader_has_one_team_guess_and_no_extra_guess_notice(self):
        self.win_solo(self.leader)
        client = self.client_for(self.leader)
        state = client.get(reverse('wordle-state')).json()
        self.assertEqual(state['bonus_guesses'], 0)
        game = WordleGame.objects.get(is_finished=False)
        game.word = 'SOFTWARE'
        game.save()
        first = client.post(
            reverse('wordle-guess'), {'guess': 'standard'}, format='json')
        self.assertEqual(first.status_code, 200)
        second = client.post(
            reverse('wordle-guess'), {'guess': 'solution'}, format='json')
        self.assertEqual(second.status_code, 400)
        self.assertIn('already guessed', second.json()['error'])
        games = {
            g['key']: g
            for g in client.get(reverse('games-status')).json()['games']}
        self.assertEqual(games['wordle']['bonus_guesses'], 0)
