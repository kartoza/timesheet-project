# Generated by Django 4.0.4 on 2023-08-10 03:32

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('timesheet', '0019_alter_task_last_update'),
    ]

    operations = [
        migrations.AlterField(
            model_name='timelog',
            name='task',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='timesheet.task'),
        ),
    ]