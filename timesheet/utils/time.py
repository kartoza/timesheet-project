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

def convert_time_to_user_timezone(dt: datetime, user: get_user_model()):
    user_tz = tz.gettz(user.profile.timezone)
    return dt.astimezone(user_tz).replace(tzinfo=timezone.utc)
