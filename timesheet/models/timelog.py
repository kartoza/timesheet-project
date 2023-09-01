from django.conf import settings
from django.db import models
from django.utils import timezone

import pytz

TIMEZONES = tuple(zip(pytz.all_timezones, pytz.all_timezones))


class Timelog(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    task = models.ForeignKey(
        'timesheet.Task',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    activity = models.ForeignKey(
        'timesheet.Activity',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    description = models.TextField(
        null=True,
        blank=True
    )

    start_time = models.DateTimeField(
        default=timezone.now
    )

    timezone = models.CharField(
        max_length=100,
        choices=TIMEZONES,
        default='',
        blank=True
    )

    end_time = models.DateTimeField(
        blank=True,
        null=True
    )

    submitted = models.BooleanField(
        help_text='Submitted to erp site',
        default=False
    )

    def __str__(self):
        return f'{self.user} - {self.task}'
