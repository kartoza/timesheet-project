from django.db import models
from preferences.models import Preferences


class TimesheetPreferences(Preferences):
    admin_token = models.CharField(
        max_length=200,
        default=''
    )

    map_api_key = models.CharField(
        max_length=200,
        default=''
    )
