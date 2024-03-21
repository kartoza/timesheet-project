from django.contrib.auth import get_user_model
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

import pytz

TIMEZONES = tuple(zip(pytz.all_timezones, pytz.all_timezones))


def get_country_code_from_timezone(timezone_str):
    timezone_country = {}
    for countrycode in pytz.country_timezones:
        timezones = pytz.country_timezones[countrycode]
        for timezone in timezones:
            timezone_country[timezone] = countrycode
    return timezone_country[timezone_str]


class Profile(models.Model):
    user = models.OneToOneField(
        get_user_model(),
        on_delete=models.CASCADE
    )

    api_secret = models.CharField(
        max_length=128,
        null=True,
        blank=True
    )

    api_key = models.CharField(
        max_length=128,
        null=True,
        blank=True
    )

    timezone = models.CharField(
        max_length=100,
        choices=TIMEZONES,
        default='UTC'
    )

    employee_id = models.CharField(
        max_length=255,
        default='',
        blank=True
    )

    employee_name = models.CharField(
        max_length=255,
        default='',
        blank=True
    )

    lat = models.FloatField(
        blank=True,
        null=True
    )

    lon = models.FloatField(
        blank=True,
        null=True
    )

    profile_picture = models.FileField(
        null=True,
        blank=True
    )

    @property
    def token(self):
        return f'{self.api_key}:{self.api_secret}'


@receiver(post_save, sender=get_user_model())
def create_profile(sender, instance, created, **kwargs):
    Profile.objects.get_or_create(
        user=instance
    )
