from django.db import models

from timesheet.models.project import Project


class ProjectMember(models.Model):
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='members'
    )
    employee = models.CharField(max_length=256)
    role = models.CharField(max_length=100, blank=True, default='')

    def __str__(self):
        return f'{self.project.name} — {self.employee}'

    class Meta:
        unique_together = ('project', 'employee')
