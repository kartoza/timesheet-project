from django.db import models


class BusinessUnit(models.Model):
    name = models.CharField(max_length=256, unique=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


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
