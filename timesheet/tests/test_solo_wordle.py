from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from timesheet.models import SoloWordleGame, WordleGame


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
        self.assertEqual(self.user.profile.bonus_guesses, 1)
        self.assertEqual(self.user.profile.points, 0)
        again = self.client.post(self.url, {'guess': 'apple'}, format='json')
        self.assertEqual(again.status_code, 400)

    def test_loss_after_six_guesses(self):
        for _ in range(6):
            data = self.client.post(self.url, {'guess': 'about'}, format='json').json()
        self.assertTrue(data['is_finished'])
        self.assertFalse(data['won'])
        self.assertEqual(data['word'], 'APPLE')
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.bonus_guesses, 0)

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
        self.user.profile.bonus_guesses = 3
        self.user.profile.save()
        self.client.get(reverse('wordle-state'))
        game = WordleGame.objects.get(is_finished=False)
        game.word = 'SOFTWARE'
        game.save()
        team = reverse('wordle-guess')
        for guess, status in (('standard', 200), ('solution', 200), ('treasure', 400)):
            self.assertEqual(
                self.client.post(team, {'guess': guess}, format='json').status_code,
                status)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.bonus_guesses, 2)
        self.assertTrue(self.client.get(reverse('wordle-state')).json()['has_guessed'])


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
