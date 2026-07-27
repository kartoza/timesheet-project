import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timesheet', '0041_add_billable_hours_to_task'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='timesheetpreferences',
            name='erp_admin_user',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='+',
                help_text='User whose ERP credentials are used for admin data retrieval. Falls back to the first superuser if not set.',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
