from django.conf import settings
from django.db import models

from microblog.models.post import Post


class ScheduledPostConfig(models.Model):
    name = models.CharField(max_length=200, help_text='Human-readable label for this feed')
    rss_url = models.URLField(help_text='RSS feed URL to fetch posts from')
    post_type = models.CharField(
        max_length=32,
        choices=Post.TYPE_CHOICES,
        default=Post.TYPE_DEFAULT,
        help_text='Type assigned to every post created from this feed',
    )
    posts_per_day = models.PositiveIntegerField(
        default=1,
        help_text='Maximum number of posts to publish per day from this feed',
    )
    display_duration_hours = models.PositiveIntegerField(
        default=24,
        help_text='How many hours each post stays visible (sets period_end)',
    )
    is_active = models.BooleanField(default=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='scheduled_post_configs',
        help_text='User account used as the post author',
    )
    tags = models.ManyToManyField(
        'microblog.Tag',
        blank=True,
        related_name='scheduled_post_configs',
        help_text='Tags automatically added to every post created from this feed',
    )
    last_fetched_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='When this feed was last successfully fetched',
    )
    last_item_guid = models.CharField(
        max_length=500,
        blank=True,
        help_text='GUID of the most recently published RSS item — used to avoid duplicates',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name
