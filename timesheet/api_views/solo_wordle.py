import random

from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from timesheet.api_views.wordle import evaluate_guess
from timesheet.models.wordle import SoloWordleGame
from timesheet.utils.games import user_today
from timesheet.wordle_words import SOLO_VALID_GUESSES, SOLO_WORDLE_WORDS

SOLO_WORD_LENGTH = 5
SOLO_MAX_GUESSES = 6


def word_for_date(play_date):
    """Everyone gets the same word on a given day."""
    return random.Random(play_date.isoformat()).choice(SOLO_WORDLE_WORDS)


def get_game(user):
    """Today's game for the user, created on first visit. The word is saved
    with the game so it doesn't change if the word list does."""
    today = user_today(user)
    game = SoloWordleGame.objects.filter(user=user, play_date=today).first()
    if game is None:
        game = SoloWordleGame.objects.create(
            user=user, play_date=today, word=word_for_date(today)
        )
    return game


def build_state(game, user):
    return {
        'word_length': SOLO_WORD_LENGTH,
        'max_guesses': SOLO_MAX_GUESSES,
        'guesses': [
            {'guess': g, 'result': evaluate_guess(g, game.word)}
            for g in game.guesses
        ],
        'is_finished': game.is_finished,
        'won': game.won,
        # Only revealed when the game is over.
        'word': game.word if game.is_finished else None,
    }


@extend_schema(exclude=True)
class SoloWordleStateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        with transaction.atomic():
            return Response(build_state(get_game(request.user), request.user))


@extend_schema(exclude=True)
class SoloWordleGuessView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        guess = str(request.data.get('guess', '')).strip().upper()
        if not guess.isascii() or not guess.isalpha():
            return Response({'error': 'Guess must only contain letters.'}, status=400)
        if len(guess) != SOLO_WORD_LENGTH:
            return Response(
                {'error': f'Guess must be {SOLO_WORD_LENGTH} letters.'},
                status=400
            )

        with transaction.atomic():
            get_game(request.user)
            game = SoloWordleGame.objects.select_for_update().get(
                user=request.user, play_date=user_today(request.user)
            )
            if game.is_finished:
                return Response(
                    {'error': 'You already played today. Come back tomorrow.'},
                    status=400
                )
            if guess != game.word and guess not in SOLO_VALID_GUESSES:
                return Response(
                    {'error': 'Not a valid English word.'}, status=400
                )
            game.guesses = game.guesses + [guess]
            if guess == game.word:
                game.won = True
                game.is_finished = True
            elif len(game.guesses) >= SOLO_MAX_GUESSES:
                game.is_finished = True
            game.save()
            return Response(build_state(game, request.user))
