import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

import timesheet.models.wordle


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("timesheet", "0050_connections_puzzle_sources"),
    ]

    operations = [
        migrations.AddField(
            model_name="profile",
            name="bonus_guesses",
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AlterUniqueTogether(
            name="wordleguess",
            unique_together=set(),
        ),
        migrations.CreateModel(
            name="SoloWordleGame",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("word", timesheet.models.wordle.EncryptedWordField()),
                ("play_date", models.DateField()),
                ("guesses", models.JSONField(default=list)),
                ("is_finished", models.BooleanField(default=False)),
                ("won", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="solo_wordle_games",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-id"],
                "unique_together": {("user", "play_date")},
            },
        ),
    ]
