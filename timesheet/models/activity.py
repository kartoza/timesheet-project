from django.db import models


class Activity(models.Model):

    name = models.CharField(
        help_text='Name of the activity',
        max_length=512,
        blank=False,
        null=False
    )

    def __str__(self):
        return self.name

    class Meta:
        verbose_name_plural = 'Activities'
        