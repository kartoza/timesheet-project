from datetime import datetime, timezone
from dateutil import tz
from django.contrib.auth import get_user_model


def convert_time(dt: datetime, user: get_user_model()):
    """
    Convert datetime using user's timezone
    :param dt: datetime object
    :param user: user object
    :return: converted datetime
    """
    user_tz = tz.gettz(user.profile.timezone)
    local_time = dt.replace(tzinfo=user_tz)
    return local_time.astimezone(timezone.utc)


def convert_time_to_user_timezone(dt: datetime, timelog_timezone: str):
    user_tz = tz.gettz(timelog_timezone)
    return dt.astimezone(user_tz).replace(tzinfo=timezone.utc)


def localize_and_convert_to_utc(
        dt: datetime, timezone_str: str
) -> datetime:
    """
    Localize a naive datetime to the given timezone and convert it to UTC.

    :param dt: A naive datetime object.
    :param timezone_str: The timezone string in which to localize the datetime.
    :return: A datetime object localized to UTC.
    """
    timezone_obj = tz.gettz(timezone_str)
    dt_timezone = dt.replace(tzinfo=timezone_obj)
    return dt_timezone.astimezone(tz.UTC)
