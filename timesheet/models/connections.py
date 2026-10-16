from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone


class ConnectionsPuzzle(models.Model):
    """A puzzle that can be picked for the daily game once it is approved."""

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        APPROVED = 'approved', 'Approved'
        ARCHIVED = 'archived', 'Archived'

    class Source(models.TextChoices):
        MANUAL = 'manual', 'Manual'
        IMPORTED = 'imported', 'Imported'

    # [{'category': str, 'words': [str, ...]}, ...] easiest group first.
    groups = models.JSONField()
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.DRAFT
    )
    source = models.CharField(
        max_length=16, choices=Source.choices, default=Source.MANUAL
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-id']

    def __str__(self):
        return ' / '.join(g['category'] for g in self.groups)


class ConnectionsGame(models.Model):
    puzzle = models.ForeignKey(
        ConnectionsPuzzle,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='games'
    )
    # Copy of the puzzle groups, so later edits don't change a running game.
    groups = models.JSONField()
    # The 16 words in the shuffled order shown to everyone.
    words_order = models.JSONField()
    is_finished = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-id']


class ConnectionsAttempt(models.Model):
    game = models.ForeignKey(
        ConnectionsGame,
        on_delete=models.CASCADE,
        related_name='attempts'
    )
    user = models.ForeignKey(
        get_user_model(),
        on_delete=models.CASCADE,
        related_name='connections_attempts'
    )
    # The four words picked, sorted.
    words = models.JSONField()
    # Index of the group that was found; null for a wrong attempt.
    group_index = models.PositiveSmallIntegerField(null=True, blank=True)
    one_away = models.BooleanField(default=False)
    attempt_date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']
        unique_together = ('game', 'user', 'attempt_date')
