import random

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from timesheet.models.profile import Profile
from timesheet.utils.games import display_name, user_today
from timesheet.models.wordle import WordleGame, WordleGuess
from timesheet.wordle_words import (
    MAX_WORD_LENGTH, MIN_WORD_LENGTH, VALID_GUESSES, WORDLE_WORDS
)

RECENT_WORDS_EXCLUDED = 20
WIN_POINTS = 2


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


def pick_word():
    recent = list(
        WordleGame.objects.values_list('word', flat=True)[:RECENT_WORDS_EXCLUDED]
    )
    # Pick the length first so 7, 8 and 9 letter words are equally likely.
    length = random.randint(MIN_WORD_LENGTH, MAX_WORD_LENGTH)
    pool = [w for w in WORDLE_WORDS if len(w) == length]
    choices = [w for w in pool if w not in recent] or pool
    return random.choice(choices)


def get_current_game():
    """Return the open game, or None when today's word is already solved.

    Only one word is started per day: a new game is created when there is no
    open game and the last game was not finished today. An unsolved game stays
    open across days.

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
    last_game = WordleGame.objects.filter(finished_at__isnull=False).first()
    if (
        last_game and
        timezone.localdate(last_game.finished_at) == timezone.localdate()
    ):
        return None
    return WordleGame.objects.create(word=pick_word())


def build_state(game, user):
    """State for the open game, or for today's solved game when game is None."""
    last_game = (
        WordleGame.objects.filter(is_finished=True)
        .select_related('winner').first()
    )
    active = game is not None
    if not active:
        game = last_game
    guesses = list(game.guesses.select_related('user')) if game else []
    profile = Profile.objects.get(user=user)
    today = user_today(user)
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
        'has_guessed': (
            any(g.user_id == user.id and g.guess_date == today for g in guesses)
            and profile.bonus_guesses == 0
        ) if active else True,
        'bonus_guesses': profile.bonus_guesses,
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
                    {'error': "Today's word is already solved. "
                              'A new word comes tomorrow.'},
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
            today = user_today(request.user)
            if game.guesses.filter(
                user=request.user, guess_date=today
            ).exists():
                # Extra guesses are won in the single player wordle.
                used_bonus = Profile.objects.filter(
                    user=request.user, bonus_guesses__gt=0
                ).update(bonus_guesses=F('bonus_guesses') - 1)
                if not used_bonus:
                    return Response(
                        {'error': 'You already guessed today. '
                                  'Come back tomorrow.'},
                        status=400
                    )
            WordleGuess.objects.create(
                game=game, user=request.user, guess=guess, guess_date=today
            )
            if guess == game.word:
                game.winner = request.user
                game.is_finished = True
                Profile.objects.filter(user=request.user).update(
                    points=F('points') + WIN_POINTS
                )
            if game.is_finished:
                game.finished_at = timezone.now()
                game.save()
                # Show the finished round's result; the next word starts
                # tomorrow, so the follow-up state has no active game.
                state = build_state(game, request.user)
                state['won'] = game.winner_id == request.user.id
                state['next'] = build_state(None, request.user)
                return Response(state)
            return Response(build_state(game, request.user))
