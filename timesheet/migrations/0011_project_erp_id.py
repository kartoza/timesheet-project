# Generated by Django 4.0.4 on 2022-12-12 15:31

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timesheet', '0010_task_actual_time_task_expected_time'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='erp_id',
            field=models.CharField(blank=True, default='', help_text='Project ID from erpnext', max_length=256),
        ),
    ]
