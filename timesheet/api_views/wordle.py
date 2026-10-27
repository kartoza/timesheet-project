import random

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from preferences import preferences
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from timesheet.models.profile import Profile
from timesheet.utils.games import display_name, has_bonus_guess, user_today
from timesheet.models.wordle import WordleGame, WordleGuess
from timesheet.wordle_words import (
    MAX_DIFFICULTY, MAX_WORD_LENGTH, MIN_DIFFICULTY, MIN_WORD_LENGTH,
    VALID_GUESSES, WORDLE_WORDS_BY_LEVEL
)

RECENT_WORDS_EXCLUDED = 20
# A new word starts when one is solved, until this many were used up today.
WORDLE_GAMES_PER_DAY = 2
# Longer words are harder, so they are worth more points.
WIN_POINTS = {7: 2, 8: 3, 9: 4}


def evaluate_guess(guess, word):
    """Standard wordle scoring: correct / present / absent per letter."""
    result = ['absent'] * len(word)
    remaining = {}
    for i, letter in enumerate(word):
        if guess[i] == letter:
            result[i] = 'correct'
        else:
            remaining[letter] = remaining.get(letter, 0) + 1
    for i, letter in enumerate(guess):
        if result[i] == 'correct':
            continue
        if remaining.get(letter, 0) > 0:
            result[i] = 'present'
            remaining[letter] -= 1
    return result


def get_difficulty():
    """Difficulty level from the site settings, kept within 1 to 5."""
    level = preferences.TimesheetPreferences.wordle_difficulty
    return min(max(level, MIN_DIFFICULTY), MAX_DIFFICULTY)


def pick_word():
    """Pick the word of a new game, using the current difficulty setting."""
    recent = list(
        WordleGame.objects.values_list('word', flat=True)[:RECENT_WORDS_EXCLUDED]
    )
    words = WORDLE_WORDS_BY_LEVEL[get_difficulty()]
    # Pick the length first so 7, 8 and 9 letter words are equally likely.
    length = random.randint(MIN_WORD_LENGTH, MAX_WORD_LENGTH)
    pool = [w for w in words if len(w) == length]
    choices = [w for w in pool if w not in recent] or pool
    return random.choice(choices)


def games_used_today():
    """Number of games started and solved today (server date)."""
    start = timezone.localtime().replace(
        hour=0, minute=0, second=0, microsecond=0)
    return WordleGame.objects.filter(
        created_at__gte=start, finished_at__gte=start
    ).count()


def guesses_today(user):
    """Guesses the user made today, over all words."""
    return WordleGuess.objects.filter(
        user=user, guess_date=user_today(user)
    ).count()


def won_today(user):
    """True if the user solved a team word today.

    A winner is done for the day, even with an extra guess left. The
    winning guess is the last one on its word, so a game won by the user
    that has a guess of theirs dated today was won today.
    """
    return WordleGame.objects.filter(
        winner=user, guesses__user=user,
        guesses__guess_date=user_today(user)
    ).exists()


def guesses_left_today(user):
    """Guesses the user may still make today, over all words.

    One a day, or two with the extra guess earned in the solo wordle. Someone
    who already won today has none left.
    """
    if won_today(user):
        return 0
    allowed = 2 if has_bonus_guess(user) else 1
    return max(allowed - guesses_today(user), 0)


def get_current_game():
    """Return the open game, or None when today's words are all solved.

    Up to WORDLE_GAMES_PER_DAY words are started per day: when one is solved
    a new one is created, until that many were solved today. An unsolved game
    stays open across days. A game that was solved today but created on an
    earlier day doesn't use up one of today's words, so a new game starts
    straight away.

    Must be called inside a transaction so concurrent requests are serialised
    on the open game row.
    """
    game = (
        WordleGame.objects.select_for_update()
        .filter(is_finished=False).order_by('-id').first()
    )
    if game and MIN_WORD_LENGTH <= len(game.word) <= MAX_WORD_LENGTH:
        return game
    if game:
        # Left over from when other word lengths were allowed; its guesses
        # would not be validated against the current word lists. Close it
        # without a finish time so it doesn't count as solved today.
        game.is_finished = True
        game.save()
    if games_used_today() >= WORDLE_GAMES_PER_DAY:
        return None
    return WordleGame.objects.create(word=pick_word())


def build_state(game, user):
    """State for the open game, or for the last solved game when game is None."""
    last_game = (
        WordleGame.objects.filter(is_finished=True)
        .select_related('winner').first()
    )
    active = game is not None
    if not active:
        game = last_game
    guesses = list(game.guesses.select_related('user')) if game else []
    profile = Profile.objects.get(user=user)
    left = guesses_left_today(user)
    return {
        'active': active,
        'word_length': len(game.word) if game and active else 0,
        'guesses': [
            {
                'user': display_name(g.user),
                'is_me': g.user_id == user.id,
                'guess': g.guess,
                'result': evaluate_guess(g.guess, game.word),
            } for g in guesses
        ],
        'has_guessed': (left == 0) if active else True,
        'bonus_guesses': int(has_bonus_guess(user) and left > 0)
        if active else 0,
        'won_today': won_today(user),
        'last_game': {
            'word': last_game.word,
            'winner': display_name(last_game.winner)
            if last_game.winner else None,
        } if last_game else None,
        'points': profile.points,
    }


@extend_schema(exclude=True)
class WordleStateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        with transaction.atomic():
            game = get_current_game()
            return Response(build_state(game, request.user))


@extend_schema(exclude=True)
class WordleGuessView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        guess = str(request.data.get('guess', '')).strip().upper()
        if not guess.isascii() or not guess.isalpha():
            return Response({'error': 'Guess must only contain letters.'}, status=400)

        with transaction.atomic():
            game = get_current_game()
            if game is None:
                return Response(
                    {'error': "Today's words are already solved. "
                              'New words come tomorrow.'},
                    status=400
                )
            if len(guess) != len(game.word):
                return Response(
                    {'error': f'Guess must be {len(game.word)} letters.'},
                    status=400
                )
            if guess != game.word and guess not in VALID_GUESSES:
                return Response(
                    {'error': 'Not a valid English word.'}, status=400
                )
            if guesses_left_today(request.user) == 0:
                if won_today(request.user):
                    message = 'You already won today. Come back tomorrow.'
                elif has_bonus_guess(request.user):
                    message = ('You already used your extra guess today. '
                               'Come back tomorrow.')
                else:
                    message = 'You already guessed today. Come back tomorrow.'
                return Response({'error': message}, status=400)
            WordleGuess.objects.create(
                game=game, user=request.user, guess=guess,
                guess_date=user_today(request.user)
            )
            if guess == game.word:
                game.winner = request.user
                game.is_finished = True
                Profile.objects.filter(user=request.user).update(
                    points=F('points') + WIN_POINTS[len(game.word)]
                )
            if game.is_finished:
                game.finished_at = timezone.now()
                game.save()
                # Show the finished round's result. The next word starts
                # straight away if fewer than two were used up today.
                state = build_state(game, request.user)
                state['won'] = game.winner_id == request.user.id
                state['points_won'] = (
                    WIN_POINTS[len(game.word)] if state['won'] else 0
                )
                state['next'] = build_state(get_current_game(), request.user)
                return Response(state)
            return Response(build_state(game, request.user))
