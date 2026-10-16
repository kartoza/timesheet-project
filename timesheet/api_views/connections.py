import random

from django.db import transaction
from django.db.models import F
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from timesheet.models.connections import (
    ConnectionsAttempt, ConnectionsGame, ConnectionsPuzzle
)
from timesheet.models.profile import Profile
from timesheet.utils.connections import GROUP_COUNT, GROUP_SIZE
from timesheet.utils.games import display_name, user_today

RECENT_PUZZLES_EXCLUDED = 10


def create_game():
    """Start a game from an approved puzzle, or None if there isn't one."""
    approved = ConnectionsPuzzle.objects.filter(
        status=ConnectionsPuzzle.Status.APPROVED
    )
    recent = list(
        ConnectionsGame.objects.filter(puzzle__isnull=False)
        .values_list('puzzle_id', flat=True)[:RECENT_PUZZLES_EXCLUDED]
    )
    choices = list(approved.exclude(id__in=recent)) or list(approved)
    if not choices:
        return None
    puzzle = random.choice(choices)
    groups = puzzle.groups
    words = [w for group in groups for w in group['words']]
    random.shuffle(words)
    return ConnectionsGame.objects.create(
        puzzle=puzzle, groups=groups, words_order=words
    )


def solved_today():
    """True when a puzzle was finished today (the next one starts tomorrow)."""
    last_game = ConnectionsGame.objects.filter(
        finished_at__isnull=False
    ).first()
    return bool(
        last_game and
        timezone.localdate(last_game.finished_at) == timezone.localdate()
    )


def get_current_game():
    """Return the open game, or None when there is nothing to play today.

    That is the case when today's puzzle is already solved, or when no
    approved puzzle is available.

    Same rules as Wordle: one puzzle is started per day, and an unsolved one
    stays open across days. Call inside a transaction.
    """
    game = (
        ConnectionsGame.objects.select_for_update()
        .filter(is_finished=False).order_by('-id').first()
    )
    if game:
        return game
    if solved_today():
        return None
    return create_game()


def has_played_today(game, user):
    """True when the user has nothing left to do today."""
    if game is None:
        return True
    return game.attempts.filter(
        user=user, attempt_date=user_today(user)
    ).exists()


def build_state(game, user):
    """State for the open game, or for today's solved game when game is None."""
    active = game is not None
    if not active:
        game = ConnectionsGame.objects.filter(finished_at__isnull=False).first()
    if game is None:
        # No puzzle has ever been available.
        return {
            'active': False,
            'unavailable': True,
            'words': [],
            'solved': [],
            'attempts': [],
            'has_played': True,
            'points': Profile.objects.get(user=user).points,
        }
    attempts = list(game.attempts.select_related('user'))
    solved = sorted(
        (a for a in attempts if a.group_index is not None),
        key=lambda a: a.group_index
    )
    solved_words = {w for a in solved for w in a.words}
    return {
        'active': active,
        # Nothing to play and today's puzzle wasn't solved: none is approved.
        'unavailable': not active and not solved_today(),
        'words': [w for w in game.words_order if w not in solved_words]
        if active else [],
        'solved': [
            {
                'level': a.group_index,
                'category': game.groups[a.group_index]['category'],
                'words': game.groups[a.group_index]['words'],
                'found_by': display_name(a.user),
                'is_me': a.user_id == user.id,
            } for a in solved
        ],
        'attempts': [
            {
                'user': display_name(a.user),
                'is_me': a.user_id == user.id,
                'words': a.words,
                'one_away': a.one_away,
            } for a in attempts if a.group_index is None
        ],
        'has_played': has_played_today(game, user) if active else True,
        'points': Profile.objects.get(user=user).points,
    }


@extend_schema(exclude=True)
class ConnectionsStateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        with transaction.atomic():
            game = get_current_game()
            return Response(build_state(game, request.user))


@extend_schema(exclude=True)
class ConnectionsPickView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        words = request.data.get('words')
        if not isinstance(words, list) or not all(
            isinstance(w, str) for w in words
        ):
            return Response({'error': 'Pick four words.'}, status=400)
        words = sorted({w.strip().upper() for w in words})
        if len(words) != GROUP_SIZE:
            return Response({'error': 'Pick four different words.'}, status=400)

        with transaction.atomic():
            game = get_current_game()
            if game is None:
                return Response(
                    {'error': "There is no puzzle to play right now. "
                              'A new one comes tomorrow.'},
                    status=400
                )
            today = user_today(request.user)
            if game.attempts.filter(
                user=request.user, attempt_date=today
            ).exists():
                return Response(
                    {'error': 'You already played today. Come back tomorrow.'},
                    status=400
                )
            solved_indexes = set(
                game.attempts.filter(group_index__isnull=False)
                .values_list('group_index', flat=True)
            )
            solved_words = {
                w for i in solved_indexes for w in game.groups[i]['words']
            }
            open_words = set(game.words_order) - solved_words
            if not set(words) <= open_words:
                return Response(
                    {'error': 'Some of those words are not available '
                              '(already solved by the team).'},
                    status=400
                )

            group_index = None
            one_away = False
            for i, group in enumerate(game.groups):
                if i in solved_indexes:
                    continue
                overlap = len(set(words) & set(group['words']))
                if overlap == GROUP_SIZE:
                    group_index = i
                elif overlap == GROUP_SIZE - 1:
                    one_away = True

            ConnectionsAttempt.objects.create(
                game=game, user=request.user, words=words,
                group_index=group_index,
                one_away=one_away and group_index is None,
                attempt_date=today
            )
            result = 'wrong'
            if group_index is not None:
                result = 'correct'
                Profile.objects.filter(user=request.user).update(
                    points=F('points') + 1
                )
                if len(solved_indexes) + 1 == GROUP_COUNT:
                    game.is_finished = True
                    game.finished_at = timezone.now()
                    game.save()
            elif one_away:
                result = 'one_away'

            state = build_state(game, request.user)
            state['result'] = result
            if group_index is not None:
                state['group'] = game.groups[group_index]['category']
            if game.is_finished:
                state['next'] = build_state(None, request.user)
            return Response(state)
