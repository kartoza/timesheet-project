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


def get_leaderboard(limit=10):
    profiles = (
        Profile.objects.filter(user__is_active=True, points__gt=0)
        .select_related('user').order_by('-points', 'user__username')[:limit]
    )
    return [
        {'user': display_name(p.user), 'points': p.points} for p in profiles
    ]
