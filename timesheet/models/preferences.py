from django.db import models
from preferences.models import Preferences

import pytz

TIMEZONES = tuple(zip(pytz.all_timezones, pytz.all_timezones))


class TimesheetPreferences(Preferences):
    admin_token = models.CharField(
        max_length=200,
        default=''
    )

    map_api_key = models.CharField(
        max_length=200,
        default=''
    )

    erp_timezone = models.CharField(
        max_length=100,
        choices=TIMEZONES,
        default='',
        blank=True
    )

    unavailable_dates = models.TextField(
        default='',
        blank=True,
        help_text=(
            'Enter the dates when timesheet submission is not available, separated by commas. '
            'E.g., "2023-12-24,2023-12-25". On these dates, users will not be able to submit timesheet.'
        )
    )
