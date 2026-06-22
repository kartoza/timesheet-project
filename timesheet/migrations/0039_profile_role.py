from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timesheet', '0038_add_last_synced_at_to_project'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='role',
            field=models.CharField(
                choices=[
                    ('employee', 'Employee'),
                    ('project_manager', 'Project Manager'),
                    ('relations_manager', 'Relations Manager'),
                    ('director', 'Director'),
                    ('admin', 'Admin'),
                ],
                default='employee',
                max_length=32,
            ),
        ),
    ]
