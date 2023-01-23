from django.db import models

from timesheet.models.profile import TIMEZONES


class Clock(models.Model):

    
    timezone = models.CharField(
        max_length=100,
        choices=TIMEZONES,
        default='UTC'
    )
    
    flag = models.CharField(
        blank=True,
        default='',
        max_length=10
    )

    order = models.IntegerField(
        blank=False,
        null=False,
        default=0
    )

    class Meta:
        ordering = ['order']
