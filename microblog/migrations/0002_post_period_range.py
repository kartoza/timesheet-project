from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('microblog', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='post',
            name='period_end',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='post',
            name='period_start',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
