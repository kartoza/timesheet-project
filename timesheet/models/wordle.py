import base64
import hashlib

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone


def _fernet():
    # Derived from SECRET_KEY unless a dedicated key is configured.
    secret = getattr(settings, 'WORDLE_ENCRYPTION_KEY', None) or settings.SECRET_KEY
    key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
    return Fernet(key)


class EncryptedWordField(models.TextField):
    """Stores the word encrypted so it can't be read from the database or
    the admin pages. Values that fail to decrypt (rows written before the
    field was encrypted) are returned as they are."""

    def from_db_value(self, value, expression, connection):
        if value is None:
            return value
        try:
            return _fernet().decrypt(value.encode()).decode()
        except InvalidToken:
            return value

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if value is None:
            return value
        return _fernet().encrypt(value.encode()).decode()


class WordleGame(models.Model):
    word = EncryptedWordField()
    is_finished = models.BooleanField(default=False)
    winner = models.ForeignKey(
        get_user_model(),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='wordle_wins'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-id']


class WordleGuess(models.Model):
    game = models.ForeignKey(
        WordleGame,
        on_delete=models.CASCADE,
        related_name='guesses'
    )
    user = models.ForeignKey(
        get_user_model(),
        on_delete=models.CASCADE,
        related_name='wordle_guesses'
    )
    guess = models.CharField(max_length=32)
    # Day (in the user's timezone) the guess was made; one guess per day.
    guess_date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']
        unique_together = ('game', 'user', 'guess_date')
