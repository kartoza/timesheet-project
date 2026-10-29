import pytz
from django.utils import timezone

from timesheet.models.profile import Profile


def display_name(user):
    return user.first_name or user.username


def user_today(user):
    """Today's date in the user's own timezone."""
    try:
        tz = pytz.timezone(user.profile.timezone)
    except pytz.UnknownTimeZoneError:
        tz = pytz.UTC
    return timezone.now().astimezone(tz).date()


def is_leader(user):
    """True for whoever is first on the leaderboard (ties share first place).
    Nobody leads before the first points are won."""
    points = Profile.objects.get(user=user).points
    return points > 0 and get_rank(points) == 1


def has_bonus_guess(user):
    """Winning today's solo wordle earns one extra team wordle guess, valid
    only for that day. The leader of the leaderboard doesn't get one."""
    from timesheet.models.wordle import SoloWordleGame
    return SoloWordleGame.objects.filter(
        user=user, play_date=user_today(user), won=True
    ).exists() and not is_leader(user)


def get_rank(points):
    """Players with the same points share a rank."""
    return Profile.objects.filter(
        user__is_active=True, points__gt=points
    ).count() + 1


def get_leaderboard(user, limit=10):
    profiles = list(
        Profile.objects.filter(user__is_active=True, points__gt=0)
        .select_related('user').order_by('-points', 'user__username')[:limit]
    )
    return [
        {
            'rank': get_rank(p.points),
            'user': display_name(p.user),
            'points': p.points,
            'is_me': p.user_id == user.id,
        } for p in profiles
    ]
