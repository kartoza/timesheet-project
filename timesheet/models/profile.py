from django.contrib.auth import get_user_model
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class Profile(models.Model):
    user = models.OneToOneField(
        get_user_model(),
        on_delete=models.CASCADE
    )

    token = models.CharField(
        max_length=128,
        null=True,
        blank=True
    )


@receiver(post_save, sender=get_user_model())
def create_profile(sender, instance, created, **kwargs):
    Profile.objects.get_or_create(
        user=instance
    )
