# Generated by Django 4.0.4 on 2023-03-15 13:07

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timesheet', '0017_savedsummary'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='last_update',
            field=models.DateTimeField(auto_now=True),
        ),
    ]
