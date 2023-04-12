from django.contrib.auth import get_user_model
from django.db import models


class Schedule(models.Model):
    user_project = models.ForeignKey(
        'schedule.UserProjectSlot',
        null=True,
        blank=True,
        on_delete=models.CASCADE
    )

    user = models.ForeignKey(
        get_user_model(),
        null=True,
        blank=True,
        related_name='schedule_user',
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

    start_time = models.DateTimeField(
        null=True,
        blank=True
    )

    end_time = models.DateTimeField(
        null=True,
        blank=True
    )

    notes = models.TextField(
        null=True,
        blank=True
    )

    first_day_number = models.IntegerField(
        null=True,
        blank=True
    )

    last_day_number = models.IntegerField(
        null=True,
        blank=True
    )

    hours_per_day = models.FloatField(
        null=True,
        blank=True
    )

    erp_id = models.CharField(
        max_length=100,
        default="",
        blank=True
    )
