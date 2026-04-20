from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone


class PostQuerySet(models.QuerySet):
    def visible(self):
        now = timezone.now()
        return self.filter(
            is_published=True
        ).filter(
            Q(period_start__isnull=True) | Q(period_start__lte=now)
        ).filter(
            Q(period_end__isnull=True) | Q(period_end__gte=now)
        )


class Post(models.Model):
    TYPE_DEFAULT = 'default'
    TYPE_ANNOUNCEMENT = 'announcement'
    TYPE_TIPS = 'tips'
    TYPE_QUESTION = 'question'
    TYPE_WARNING = 'warning'
    TYPE_CELEBRATION = 'celebration'

    TYPE_CHOICES = (
        (TYPE_DEFAULT, 'Default'),
        (TYPE_ANNOUNCEMENT, 'Announcement'),
        (TYPE_TIPS, 'Tips'),
        (TYPE_QUESTION, 'Question'),
        (TYPE_WARNING, 'Warning'),
        (TYPE_CELEBRATION, 'Celebration'),
    )

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='microblog_posts'
    )
    content = models.TextField()
    type = models.CharField(
        max_length=32,
        choices=TYPE_CHOICES,
        default=TYPE_DEFAULT
    )
    tags = models.ManyToManyField(
        'microblog.Tag',
        blank=True,
        related_name='posts'
    )
    period_start = models.DateTimeField(
        null=True,
        blank=True
    )
    period_end = models.DateTimeField(
        null=True,
        blank=True
    )
    is_published = models.BooleanField(
        default=True
    )
    is_pinned = models.BooleanField(
        default=False
    )
    pin_valid_until = models.DateTimeField(
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )
    updated_at = models.DateTimeField(
        auto_now=True
    )

    objects = PostQuerySet.as_manager()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.content[:50]

    @property
    def is_visible(self):
        now = timezone.now()
        return (
            self.is_published
            and (self.period_start is None or self.period_start <= now)
            and (self.period_end is None or self.period_end >= now)
        )


class Tag(models.Model):
    name = models.CharField(
        max_length=100,
        unique=True
    )

    def __str__(self):
        return self.name


class Like(models.Model):
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='likes'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='microblog_likes'
    )
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['post', 'user'],
                name='unique_microblog_like'
            )
        ]

    def __str__(self):
        return f'{self.user} likes {self.post}'
