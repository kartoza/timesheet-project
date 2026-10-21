import datetime
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from timesheet.api_views.wordle import evaluate_guess, user_today
from timesheet.models import WordleGame


class TestEvaluateGuess(TestCase):
    def test_duplicate_letters(self):
        self.assertEqual(
            evaluate_guess('AABB', 'ABCA'),
            ['correct', 'present', 'present', 'absent']
        )
        self.assertEqual(
            evaluate_guess('AAAA', 'ABCD'),
            ['correct', 'absent', 'absent', 'absent']
        )


class TestWordleViews(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('u1', password='pass')
        self.other = User.objects.create_user('u2', password='pass')
        self.client.login(username='u1', password='pass')

    def _game(self):
        self.client.get(reverse('wordle-state'))
        game = WordleGame.objects.get(is_finished=False)
        game.word = 'SOFTWARE'
        game.save()
        return game

    def test_state_hides_word_and_creates_game(self):
        response = self.client.get(reverse('wordle-state'))
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('word', response.json())
        self.assertEqual(WordleGame.objects.count(), 1)

    def test_not_a_word_is_rejected_without_using_the_guess(self):
        self._game()
        url = reverse('wordle-guess')
        response = self.client.post(url, {'guess': 'qqqqzzzz'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('valid English word', response.json()['error'])
        ok = self.client.post(url, {'guess': 'standard'}, format='json')
        self.assertEqual(ok.status_code, 200)

    def test_word_length_follows_the_current_word(self):
        game = self._game()
        game.word = 'INSURANCE'
        game.save()
        state = self.client.get(reverse('wordle-state')).json()
        self.assertEqual(state['word_length'], 9)
        url = reverse('wordle-guess')
        too_short = self.client.post(url, {'guess': 'standard'}, format='json')
        self.assertEqual(too_short.status_code, 400)
        ok = self.client.post(url, {'guess': 'treasures'}, format='json')
        self.assertEqual(ok.status_code, 200)

    def test_invalid_guess_length(self):
        response = self.client.post(
            reverse('wordle-guess'), {'guess': 'abc'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_one_guess_per_day_per_word(self):
        self._game()
        url = reverse('wordle-guess')
        first = self.client.post(url, {'guess': 'standard'}, format='json')
        self.assertEqual(first.status_code, 200)
        self.assertTrue(first.json()['has_guessed'])
        second = self.client.post(url, {'guess': 'solution'}, format='json')
        self.assertEqual(second.status_code, 400)
        # Next day the same user may guess the still-unsolved word again.
        tomorrow = user_today(self.user) + datetime.timedelta(days=1)
        with patch('timesheet.api_views.wordle.user_today',
                   return_value=tomorrow):
            third = self.client.post(url, {'guess': 'solution'}, format='json')
        self.assertEqual(third.status_code, 200)
        self.assertEqual(len(third.json()['guesses']), 2)

    def _win_points(self, word):
        game = self._game()
        game.word = word
        game.save()
        self.client.post(
            reverse('wordle-guess'), {'guess': word.lower()}, format='json')
        self.user.profile.refresh_from_db()
        return self.user.profile.points

    def test_eight_letter_win_awards_three_points(self):
        self.assertEqual(self._win_points('SOFTWARE'), 3)

    def test_nine_letter_win_awards_four_points(self):
        self.assertEqual(self._win_points('STANDARDS'), 4)

    def test_win_awards_points_and_waits_until_tomorrow(self):
        game = self._game()
        game.word = 'SOFTWAR'
        game.save()
        response = self.client.post(
            reverse('wordle-guess'), {'guess': 'softwar'}, format='json')
        data = response.json()
        self.assertTrue(data['won'])
        game.refresh_from_db()
        self.assertTrue(game.is_finished)
        self.assertEqual(game.winner, self.user)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.points, 2)
        # Solved today: no new word until tomorrow.
        self.assertFalse(data['next']['active'])
        self.assertEqual(WordleGame.objects.count(), 1)
        state = self.client.get(reverse('wordle-state')).json()
        self.assertFalse(state['active'])
        self.assertEqual(state['last_game']['word'], 'SOFTWAR')
        again = self.client.post(
            reverse('wordle-guess'), {'guess': 'standard'}, format='json')
        self.assertEqual(again.status_code, 400)

    def test_new_word_is_created_the_day_after_a_game_finished(self):
        game = self._game()
        self.client.post(
            reverse('wordle-guess'), {'guess': 'software'}, format='json')
        game.refresh_from_db()
        game.finished_at = timezone.now() - datetime.timedelta(days=1)
        game.save()
        state = self.client.get(reverse('wordle-state')).json()
        self.assertTrue(state['active'])
        self.assertEqual(WordleGame.objects.count(), 2)

    def test_unsolved_game_stays_open_the_next_day(self):
        game = self._game()
        WordleGame.objects.filter(id=game.id).update(
            created_at=timezone.now() - datetime.timedelta(days=3))
        self.client.get(reverse('wordle-state'))
        self.assertEqual(WordleGame.objects.count(), 1)
        self.assertFalse(WordleGame.objects.get().is_finished)

    def test_new_word_starts_when_solved_today_but_created_earlier(self):
        game = self._game()
        WordleGame.objects.filter(id=game.id).update(
            created_at=timezone.now() - datetime.timedelta(days=3))
        data = self.client.post(
            reverse('wordle-guess'), {'guess': 'software'}, format='json'
        ).json()
        self.assertTrue(data['won'])
        self.assertTrue(data['next']['active'])
        self.assertEqual(WordleGame.objects.count(), 2)
        state = self.client.get(reverse('wordle-state')).json()
        self.assertTrue(state['active'])
        self.assertEqual(WordleGame.objects.count(), 2)

    def test_stale_game_with_unsupported_length_is_closed(self):
        game = self._game()
        game.word = 'INSURANCES'
        game.save()
        state = self.client.get(reverse('wordle-state')).json()
        game.refresh_from_db()
        self.assertTrue(game.is_finished)
        self.assertIn(state['word_length'], (7, 8, 9))


class TestWordLists(TestCase):
    def test_answers_cover_all_lengths_and_are_valid_guesses(self):
        from timesheet.wordle_words import VALID_GUESSES, WORDLE_WORDS
        self.assertEqual({len(w) for w in WORDLE_WORDS}, {7, 8, 9})
        self.assertTrue(set(WORDLE_WORDS) <= VALID_GUESSES)


class TestEncryptedWord(TestCase):
    def test_word_is_encrypted_in_the_database(self):
        from django.db import connection
        game = WordleGame.objects.create(word='SOFTWARE')
        with connection.cursor() as cursor:
            cursor.execute(
                'SELECT word FROM timesheet_wordlegame WHERE id = %s',
                [game.pk]
            )
            raw = cursor.fetchone()[0]
        self.assertNotIn('SOFTWARE', raw)
        self.assertEqual(WordleGame.objects.get(pk=game.pk).word, 'SOFTWARE')

    def test_legacy_plain_word_is_still_readable(self):
        from django.db import connection
        game = WordleGame.objects.create(word='SOFTWARE')
        with connection.cursor() as cursor:
            cursor.execute(
                'UPDATE timesheet_wordlegame SET word = %s WHERE id = %s',
                ['STANDARD', game.pk]
            )
        self.assertEqual(WordleGame.objects.get(pk=game.pk).word, 'STANDARD')

    def test_admin_hides_the_word_until_finished(self):
        admin_user = User.objects.create_superuser('root', 'r@x.org', 'pass')
        client = APIClient()
        client.login(username='root', password='pass')
        game = WordleGame.objects.create(word='SOFTWARE')
        for url in (
            reverse('admin:timesheet_wordlegame_changelist'),
            reverse('admin:timesheet_wordlegame_change', args=[game.pk]),
        ):
            response = client.get(url)
            self.assertEqual(response.status_code, 200)
            self.assertNotContains(response, 'SOFTWARE')
        game.is_finished = True
        game.save()
        response = client.get(
            reverse('admin:timesheet_wordlegame_change', args=[game.pk]))
        self.assertContains(response, 'SOFTWARE')
