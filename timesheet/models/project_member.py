from django.contrib.auth import get_user_model
from django.db import models

from timesheet.models.project import Project


class ProjectMember(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='members'
    )
    user = models.ForeignKey(
        get_user_model(),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    role = models.CharField(max_length=100, blank=True, default='')
    project_lead = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.project.name} — {self.user}'

    class Meta:
        unique_together = ('project', 'user')
