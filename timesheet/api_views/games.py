from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from timesheet.api_views import connections, solo_wordle, wordle
from timesheet.models.profile import Profile
from timesheet.utils.games import get_leaderboard, get_rank, user_today


@extend_schema(exclude=True)
class GamesStatusView(APIView):
    """Lists the games and whether the user already played them today."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        with transaction.atomic():
            wordle_game = wordle.get_current_game()
            profile = Profile.objects.get(user=user)
            my_guesses_today = wordle_game.guesses.filter(
                user=user, guess_date=user_today(user)
            ).count() if wordle_game else 0
            wordle_played = wordle_game is None or (
                (my_guesses_today >= 1 and profile.bonus_guesses == 0)
                or my_guesses_today >= 2
            )
            solo_game = solo_wordle.get_game(user)
            connections_game = connections.get_current_game()
            connections_played = connections.has_played_today(
                connections_game, user
            )
        return Response({
            'points': profile.points,
            'leaderboard': get_leaderboard(user),
            'rank': get_rank(profile.points) if profile.points else None,
            'games': [
                {
                    'key': 'wordle',
                    'title': 'Team Wordle',
                    'description': 'Guess the hidden word together.',
                    'played_today': wordle_played,
                    'bonus_guesses': (
                        profile.bonus_guesses if wordle_game else 0
                    ),
                    'solved': wordle_game is None,
                    'unavailable': False,
                },
                {
                    'key': 'solo_wordle',
                    'title': 'Solo Wordle',
                    'description': 'Play on your own. Win for an extra Team Wordle guess.',
                    'played_today': solo_game.is_finished,
                    'solved': False,
                    'unavailable': False,
                },
                {
                    'key': 'connections',
                    'title': 'Connections',
                    'description': 'Find the four groups of four words.',
                    'played_today': connections_played,
                    'solved': connections_game is None and connections.solved_today(),
                    'unavailable': connections_game is None and not connections.solved_today(),
                },
            ],
        })
