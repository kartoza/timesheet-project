# Generated by Django 4.0.4 on 2023-04-11 10:25

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('timesheet', '0018_task_last_update'),
    ]

    operations = [
        migrations.AlterField(
            model_name='task',
            name='last_update',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),
    ]
