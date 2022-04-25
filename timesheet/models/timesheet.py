from django.conf import settings
from django.db import models


class Timesheet(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    task = models.ForeignKey(
        'timesheet.Task',
        null=True,
        blank=True,
        on_delete=models.CASCADE
    )

    start_time = models.DateTimeField(
        auto_now_add=True
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
