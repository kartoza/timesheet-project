from django.db import models


class BusinessUnit(models.Model):
    name = models.CharField(max_length=256, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class Issue(models.Model):
    erp_id = models.CharField(max_length=64, unique=True)
    subject = models.CharField(max_length=512, blank=True, default='')
    project = models.ForeignKey(
        'timesheet.Project',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='issues',
    )
    raised_by = models.EmailField(blank=True, default='')
    status = models.CharField(max_length=32, blank=True, default='')
    priority = models.CharField(max_length=32, blank=True, default='')
    opening_date = models.DateField(null=True, blank=True)
    is_internal = models.BooleanField(
        default=False,
        help_text='True if project is unset or the linked project is internal.',
    )

    def __str__(self):
        return f'{self.erp_id} - {self.subject}'

    class Meta:
        ordering = ['-opening_date']


class ContractTracker(models.Model):
    SLA_TYPE_SLA = 'SLA'
    SLA_TYPE_HOSTING = 'HOSTING'

    SLA_TYPE_CHOICES = (
        (SLA_TYPE_SLA, 'SLA'),
        (SLA_TYPE_HOSTING, 'Hosting'),
    )

    project = models.OneToOneField(
        'timesheet.Project',
        on_delete=models.CASCADE,
        related_name='contract_tracker',
    )
    contact_email = models.EmailField(blank=True, default='')
    sla_type = models.CharField(max_length=20, choices=SLA_TYPE_CHOICES, blank=True, default='')

    def __str__(self):
        return f'{self.project.name} ({self.sla_type})'
