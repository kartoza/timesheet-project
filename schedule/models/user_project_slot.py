from django.contrib.auth import get_user_model
from django.db import models


class UserProjectSlot(models.Model):
    project = models.ForeignKey(
        'timesheet.Project',
        null=False,
        blank=False,
        on_delete=models.CASCADE
    )

    user = models.ForeignKey(
        get_user_model(),
        null=False,
        blank=False,
        on_delete=models.CASCADE
    )

    active = models.BooleanField(
        default=True
    )

    order = models.IntegerField(
        default=0
    )

    def __str__(self):
        return self.project.name

    class Meta:
        ordering = ['order']
