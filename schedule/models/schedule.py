from django.db import models


class Schedule(models.Model):
    user_project = models.ForeignKey(
        'schedule.UserProjectSlot',
        null=False,
        blank=False,
        on_delete=models.CASCADE
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
