from django.db import transaction
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from timesheet.api_views import connections, wordle
from timesheet.models.profile import Profile
from timesheet.utils.games import get_leaderboard, user_today


@extend_schema(exclude=True)
class GamesStatusView(APIView):
    """Lists the games and whether the user already played them today."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        with transaction.atomic():
            wordle_game = wordle.get_current_game()
            wordle_played = wordle_game is None or wordle_game.guesses.filter(
                user=user, guess_date=user_today(user)
            ).exists()
            connections_game = connections.get_current_game()
            connections_played = connections.has_played_today(
                connections_game, user
            )
        return Response({
            'points': Profile.objects.get(user=user).points,
            'leaderboard': get_leaderboard(),
            'games': [
                {
                    'key': 'wordle',
                    'title': 'Wordle',
                    'description': 'Guess the hidden word together.',
                    'played_today': wordle_played,
                    'solved': wordle_game is None,
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
