from django.db import models


class Schedule(models.Model):
    user_project = models.ForeignKey(
        'schedule.UserProjectSlot',
        null=False,
        blank=False,
        on_delete=models.CASCADE
    )

    task = models.ForeignKey(
        'timesheet.Task',
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
