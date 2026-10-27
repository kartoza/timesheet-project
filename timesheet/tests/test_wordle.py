import datetime
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from preferences import preferences
from rest_framework.reverse import reverse
from rest_framework.test import APIClient

from timesheet.api_views.wordle import (
    evaluate_guess, get_difficulty, pick_word, user_today
)
from timesheet.models import SoloWordleGame, WordleGame


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
        self.other_client = APIClient()
        self.other_client.login(username='u2', password='pass')

    def guess(self, client, word):
        return client.post(
            reverse('wordle-guess'), {'guess': word}, format='json')

    def give_bonus(self, user):
        SoloWordleGame.objects.create(
            user=user, word='APPLE', play_date=user_today(user), won=True,
            is_finished=True)

    def open_game(self, word='SOFTWARE'):
        game = WordleGame.objects.get(is_finished=False)
        game.word = word
        game.save()
        return game

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

    def test_win_awards_points_and_starts_the_second_word(self):
        game = self._game()
        game.word = 'SOFTWAR'
        game.save()
        data = self.guess(self.client, 'softwar').json()
        self.assertTrue(data['won'])
        game.refresh_from_db()
        self.assertTrue(game.is_finished)
        self.assertEqual(game.winner, self.user)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.points, 2)
        # Two words a day: the next one starts straight away...
        self.assertTrue(data['next']['active'])
        self.assertEqual(WordleGame.objects.count(), 2)
        # ...but the winner already used their guess today.
        self.assertTrue(data['next']['has_guessed'])
        self.assertTrue(data['next']['won_today'])
        self.open_game('STANDARD')
        again = self.guess(self.client, 'standard')
        self.assertEqual(again.status_code, 400)
        self.assertIn('already won', again.json()['error'])

    def test_only_two_words_are_played_per_day(self):
        self._game()
        self.guess(self.client, 'software')
        self.open_game('STANDARD')
        data = self.guess(self.other_client, 'standard').json()
        self.assertTrue(data['won'])
        self.assertFalse(data['next']['active'])
        self.assertEqual(WordleGame.objects.count(), 2)
        state = self.client.get(reverse('wordle-state')).json()
        self.assertFalse(state['active'])
        self.assertEqual(WordleGame.objects.count(), 2)
        third = User.objects.create_user('u3', password='pass')
        client = APIClient()
        client.login(username='u3', password='pass')
        self.assertEqual(self.guess(client, 'standard').status_code, 400)
        # The next day there are two new words again.
        for game in WordleGame.objects.all():
            WordleGame.objects.filter(pk=game.pk).update(
                created_at=timezone.now() - datetime.timedelta(days=1),
                finished_at=timezone.now() - datetime.timedelta(days=1))
        self.assertTrue(client.get(reverse('wordle-state')).json()['active'])

    def test_a_guess_on_the_first_word_uses_the_day_s_guess(self):
        self._game()
        self.assertEqual(self.guess(self.client, 'standard').status_code, 200)
        self.guess(self.other_client, 'software')
        self.open_game('SOLUTION')
        # u1 guessed the first word without winning: nothing left today.
        state = self.client.get(reverse('wordle-state')).json()
        self.assertTrue(state['active'])
        self.assertTrue(state['has_guessed'])
        blocked = self.guess(self.client, 'solution')
        self.assertEqual(blocked.status_code, 400)
        self.assertEqual(WordleGame.objects.get(is_finished=False).guesses.count(), 0)

    def test_someone_who_missed_the_first_word_can_play_the_second(self):
        self._game()
        self.guess(self.other_client, 'software')
        self.open_game('STANDARD')
        state = self.client.get(reverse('wordle-state')).json()
        self.assertFalse(state['has_guessed'])
        self.assertEqual(self.guess(self.client, 'standard').status_code, 200)

    def test_extra_guess_can_be_used_on_the_second_word_after_a_miss(self):
        self._game()
        self.give_bonus(self.user)
        first = self.guess(self.client, 'standard').json()
        self.assertFalse(first['has_guessed'])
        self.guess(self.other_client, 'software')
        self.open_game('SOLUTION')
        state = self.client.get(reverse('wordle-state')).json()
        self.assertFalse(state['has_guessed'])
        self.assertEqual(state['bonus_guesses'], 1)
        won = self.guess(self.client, 'solution').json()
        self.assertTrue(won['won'])

    def test_extra_guess_is_used_up_after_two_guesses(self):
        self._game()
        self.give_bonus(self.user)
        self.guess(self.client, 'standard')
        self.guess(self.other_client, 'software')
        self.open_game('SOLUTION')
        self.assertEqual(self.guess(self.client, 'solutions').status_code, 400)
        self.assertEqual(self.guess(self.client, 'standard').status_code, 200)
        self.assertEqual(self.guess(self.client, 'treasure').status_code, 400)

    def test_winner_cannot_play_the_second_word_even_with_an_extra_guess(self):
        self._game()
        self.give_bonus(self.user)
        data = self.guess(self.client, 'software').json()
        self.assertTrue(data['won'])
        self.open_game('STANDARD')
        state = self.client.get(reverse('wordle-state')).json()
        self.assertTrue(state['has_guessed'])
        self.assertTrue(state['won_today'])
        self.assertEqual(state['bonus_guesses'], 0)
        blocked = self.guess(self.client, 'standard')
        self.assertEqual(blocked.status_code, 400)
        self.assertIn('already won', blocked.json()['error'])
        games = {
            g['key']: g for g in
            self.client.get(reverse('games-status')).json()['games']}
        self.assertTrue(games['wordle']['played_today'])
        self.assertEqual(games['wordle']['bonus_guesses'], 0)

    def test_winning_does_not_carry_over_to_the_next_day(self):
        self._game()
        self.give_bonus(self.user)
        self.guess(self.client, 'software')
        tomorrow = user_today(self.user) + datetime.timedelta(days=1)
        with patch('timesheet.api_views.wordle.user_today',
                   return_value=tomorrow):
            state = self.client.get(reverse('wordle-state')).json()
        self.assertFalse(state['won_today'])
        self.assertFalse(state['has_guessed'])

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


def set_difficulty(level):
    prefs = preferences.TimesheetPreferences
    prefs.wordle_difficulty = level
    prefs.save()


class TestWordleDifficulty(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user('u1', password='pass')
        self.client.login(username='u1', password='pass')

    def test_levels_have_words_of_every_length(self):
        from timesheet.wordle_words import VALID_GUESSES, WORDLE_WORDS_BY_LEVEL
        self.assertEqual(sorted(WORDLE_WORDS_BY_LEVEL), [1, 2, 3, 4, 5])
        for level, words in WORDLE_WORDS_BY_LEVEL.items():
            with self.subTest(level=level):
                self.assertEqual({len(w) for w in words}, {7, 8, 9})
                self.assertGreater(len(words), 1000)
                self.assertTrue(all(w == w.upper() and w.isalpha() for w in words))
                self.assertTrue(set(words) <= VALID_GUESSES)

    def test_unsuitable_words_are_not_in_the_pool(self):
        from timesheet.wordle_words import WORDLE_WORDS
        unsuitable = ('TERROR', 'MURDER', 'SUICID', 'COCAINE', 'NAKED')
        self.assertFalse([w for w in WORDLE_WORDS if w.startswith(unsuitable)])

    def test_default_is_the_easiest_level(self):
        self.assertEqual(get_difficulty(), 1)

    def test_words_come_from_the_selected_level(self):
        from timesheet.wordle_words import WORDLE_WORDS_BY_LEVEL
        for level in (2, 5):
            set_difficulty(level)
            words = {pick_word() for _ in range(60)}
            self.assertTrue(words <= set(WORDLE_WORDS_BY_LEVEL[level]), level)

    def test_harder_levels_have_no_plurals_or_verb_forms(self):
        from timesheet.wordle_words import WORDLE_WORDS_BY_LEVEL
        easy = set(WORDLE_WORDS_BY_LEVEL[1])
        for level in (2, 3, 4, 5):
            words = WORDLE_WORDS_BY_LEVEL[level]
            share = sum(w.endswith(('ING', 'ED')) for w in words) / len(words)
            self.assertLess(share, 0.05, level)
        # Level 1 still allows them.
        share = sum(w.endswith(('ING', 'ED', 'S')) for w in easy) / len(easy)
        self.assertGreater(share, 0.2)

    def test_out_of_range_setting_is_kept_within_one_to_five(self):
        set_difficulty(9)
        self.assertEqual(get_difficulty(), 5)
        set_difficulty(0)
        self.assertEqual(get_difficulty(), 1)

    def test_setting_only_applies_to_the_next_word(self):
        self.client.get(reverse('wordle-state'))
        game = WordleGame.objects.get(is_finished=False)
        word = game.word
        set_difficulty(5)
        self.client.get(reverse('wordle-state'))
        game.refresh_from_db()
        self.assertEqual(game.word, word)
        self.assertEqual(WordleGame.objects.count(), 1)
        # The next game, started once this one is solved, follows the setting.
        from timesheet.wordle_words import WORDLE_WORDS_BY_LEVEL
        self.client.post(
            reverse('wordle-guess'), {'guess': word.lower()}, format='json')
        new_game = WordleGame.objects.get(is_finished=False)
        self.assertIn(new_game.word, WORDLE_WORDS_BY_LEVEL[5])

    def test_setting_is_in_the_site_settings_form(self):
        from timesheet.admin import TimesheetPreferencesForm
        field = TimesheetPreferencesForm().fields['wordle_difficulty']
        self.assertEqual([c[0] for c in field.choices], [1, 2, 3, 4, 5])
