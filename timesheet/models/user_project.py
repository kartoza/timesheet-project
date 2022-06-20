from django.contrib.auth import get_user_model
from django.db import models


class UserProject(models.Model):

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

    def __str__(self):
        return f'{self.project.name} - {self.user.username}'

