from django.db import models


class Project(models.Model):

    name = models.CharField(
        help_text='Name of the project',
        max_length=512,
        blank=False,
        null=False
    )

    is_active = models.BooleanField(
        default=False
    )

    def __str__(self):
        return self.name
