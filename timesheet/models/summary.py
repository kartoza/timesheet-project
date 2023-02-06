from django.db import models
from django.contrib.auth import get_user_model
from django.dispatch import receiver
from django.utils.text import slugify
from django.db.models.signals import post_save


class SavedSummary(models.Model):

    name = models.CharField(
        max_length=256,
        null=False,
        blank=False
    )

    slug_name = models.SlugField(
        max_length=256,
        null=True,
        blank=True
    )

    active = models.BooleanField(
        default=True
    )

    view_count = models.IntegerField(
        default=0
    )

    last_updated = models.DateTimeField(
        null=True,
        blank=True
    )

    chart_data = models.TextField(
        null=True,
        blank=True
    )

    project = models.ForeignKey(
        'timesheet.Project',
        on_delete=models.CASCADE
    )

    creator = models.ForeignKey(
        get_user_model(),
        null=False,
        blank=False,
        on_delete=models.CASCADE
    )


@receiver(post_save, sender=SavedSummary)
def post_saved_summary(sender, instance, created, **kwargs):
    slug_name = slugify(instance.name)
    if not instance.slug_name:
        instance.slug_name = slug_name
        instance.save()
