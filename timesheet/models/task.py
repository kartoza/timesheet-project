from django.db import models


class Task(models.Model):

    name = models.CharField(
        help_text='Name of the task',
        max_length=256,
        null=False,
        blank=False
    )

    def __str__(self):
        return self.name
