# Generated by Django 4.0.4 on 2023-10-31 05:33

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('timesheet', '0024_alter_timelog_parent'),
    ]

    operations = [
        migrations.AddField(
            model_name='timelog',
            name='project',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='timesheet.project'),
        ),
    ]
