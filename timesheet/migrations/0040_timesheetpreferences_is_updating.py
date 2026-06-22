from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timesheet', '0039_profile_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='timesheetpreferences',
            name='is_updating',
            field=models.BooleanField(
                default=False,
                help_text='When enabled, all non-admin users see a maintenance page instead of the app.',
            ),
        ),
    ]
