from django.conf import settings
from django.db import models

from pmo_dashboard.models import BusinessUnit


class Project(models.Model):

    erp_id = models.CharField(
        help_text='Project ID from erpnext',
        max_length=256,
        default='',
        blank=True
    )

    updated = models.DateTimeField(
        null=True,
        blank=True
    )

    last_synced_at = models.DateTimeField(
        null=True,
        blank=True
    )

    name = models.CharField(
        help_text='Name of the project',
        max_length=512,
        blank=False,
        null=False
    )

    is_active = models.BooleanField(
        default=False
    )

    project_type = models.CharField(
        max_length=100,
        default='',
        blank=True,
        choices=(
            ('INTERNAL', 'Internal'),
            ('EXTERNAL', 'External'),
            ('INVESTMENT', 'Investment'),
        )
    )

    business_unit = models.ForeignKey(
        BusinessUnit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    expected_start_date = models.DateField(null=True, blank=True)
    expected_end_date = models.DateField(null=True, blank=True)

    project_lead = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='led_projects',
    )
    relations_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_projects',
    )
    customer = models.CharField(max_length=256, blank=True, default='')

    rag = models.CharField(max_length=20, blank=True, default='')

    expected_time = models.FloatField(null=True, blank=True)
    actual_time = models.FloatField(null=True, blank=True)
    progress_in_hours = models.FloatField(null=True, blank=True)
    percent_complete = models.FloatField(null=True, blank=True)

    estimated_costing = models.FloatField(null=True, blank=True)
    total_sales_amount = models.FloatField(null=True, blank=True)
    total_costing_amount = models.FloatField(null=True, blank=True)
    total_billable_amount = models.FloatField(null=True, blank=True)
    total_billed_amount = models.FloatField(null=True, blank=True)
    gross_margin = models.FloatField(null=True, blank=True)
    per_gross_margin = models.FloatField(null=True, blank=True)

    def __str__(self):
        return self.name


class ProjectLink(models.Model):
    CATEGORY_CHOICES = (
        ('DOC', 'Documentation'),
        ('CHA', 'Chat'),
        ('REP', 'Repository'),
        ('DIA', 'Diagram')
    )

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
    )

    name = models.CharField(
        blank=True,
        null=True,
        max_length=512,
        default='',
    )

    category = models.CharField(
        blank=True,
        choices=CATEGORY_CHOICES,
        max_length=3
    )

    link = models.URLField(
        blank=False,
        null=False,
    )

    display_order = models.PositiveIntegerField(
        default=0,
    )

    def __str__(self):
        return f'[{self.project.name}] {self.link}'

    def save(self, *args, **kwargs):
        if self.display_order == 0:
            last_order = (
                ProjectLink.objects.filter(project=self.project)
                .aggregate(
                    max_order=models.Max('display_order')
                )['max_order']
            )
            self.display_order = (last_order or 0) + 1
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['project_id', 'display_order']
