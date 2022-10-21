from django.db import models


class Task(models.Model):

    name = models.CharField(
        help_text='Name of the task',
        max_length=256,
        null=False,
        blank=False
    )

    erp_id = models.CharField(
        help_text='Task ID from erpnext',
        max_length=256,
        default='',
        blank=True
    )

    project = models.ForeignKey(
        'timesheet.Project',
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )

    actual_time = models.FloatField(
        default=0.0,
    )

    expected_time = models.FloatField(
        default=0.0
    )

    def __str__(self):
        return (
            f'{self.name} - '
            f'{self.project.name if self.project else "No Project"}'
        )
