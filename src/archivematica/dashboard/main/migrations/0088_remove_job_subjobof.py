from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("main", "0087_job_createdtime_microseconds"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="job",
            name="subjobof",
        ),
    ]
