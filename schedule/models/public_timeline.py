from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from faker.utils.text import slugify


class PublicTimeline(models.Model):

    start_time = models.DateField(
        null=False,
        blank=False
    )

    end_time = models.DateField(
        null=False,
        blank=False
    )

    projects = models.ManyToManyField(
        'timesheet.Project',
        blank=True
    )

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


@receiver(post_save, sender=PublicTimeline)
def post_saved_summary(sender, instance, created, **kwargs):
    slug_name = slugify(instance.name)
    if not instance.slug_name:
        instance.slug_name = slug_name
        instance.save()
