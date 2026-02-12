from django.conf import settings
from django.db import models
from django.utils import timezone

import pytz

TIMEZONES = tuple(zip(pytz.all_timezones, pytz.all_timezones))


class Timelog(models.Model):

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    task = models.ForeignKey(
        'timesheet.Task',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    project = models.ForeignKey(
        'timesheet.Project',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    activity = models.ForeignKey(
        'timesheet.Activity',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    description = models.TextField(
        null=True,
        blank=True
    )

    start_time = models.DateTimeField(
        default=timezone.now
    )

    timezone = models.CharField(
        max_length=100,
        choices=TIMEZONES,
        default='',
        blank=True
    )

    end_time = models.DateTimeField(
        blank=True,
        null=True
    )

    submitted = models.BooleanField(
        help_text='Submitted to erp site',
        default=False
    )

    is_paused = models.BooleanField(
        help_text='Timesheet is paused',
        default=False
    )

    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='children'
    )

    def get_root_ancestor(self):
        """Walk up the parent chain to find the root (parentless) timelog."""
        current = self
        seen = {self.pk}
        while current.parent is not None:
            if current.parent.pk in seen:
                break
            seen.add(current.parent.pk)
            current = current.parent
        return current

    def get_all_descendants(self):
        """Return a flat list of all descendant timelogs (recursive)."""
        descendants = []
        queue = list(self.children.all())
        seen = {self.pk}
        while queue:
            child = queue.pop(0)
            if child.pk in seen:
                continue
            seen.add(child.pk)
            descendants.append(child)
            queue.extend(list(child.children.all()))
        return descendants

    def __str__(self):
        return f'{self.user} - {self.task}'
