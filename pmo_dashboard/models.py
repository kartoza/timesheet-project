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


class SupportContactMapping(models.Model):
    """Resolves a support Issue to a customer bucket when ERPNext data alone isn't enough.

    Matches on exactly one of `email` or `project_name`:
    - `email`: a full address ('jane.doe@example.com') or a domain wildcard
      ('@kartoza.com'), used when the Issue's ERPNext Project is blank.
    - `project_name`: an ERPNext Project name whose own `customer` field isn't a
      reliable customer bucket (e.g. a shared/internal intake project), used to
      override that project's resolved customer regardless of who raised the issue.

    Blank `customer` means "known, but explicitly internal/test" — distinct from no
    matching row at all, which just means unknown/unmapped. Both are treated as
    internal for reporting purposes.
    """
    email = models.CharField(
        max_length=256, blank=True, default='',
        help_text="Full email address, or '@domain.com' for a domain-wide match. Leave blank if using project_name.",
    )
    project_name = models.CharField(
        max_length=512, blank=True, default='',
        help_text='ERPNext Project name to override, taking priority over that Project\'s own customer field. Leave blank if using email.',
    )
    customer = models.CharField(
        max_length=256, blank=True, default='',
        help_text='Customer bucket to assign (matches Project.customer values). Blank = explicitly internal/excluded.',
    )
    note = models.CharField(max_length=256, blank=True, default='')

    def __str__(self):
        key = self.project_name or self.email
        return f'{key} -> {self.customer or "(internal/excluded)"}'

    class Meta:
        ordering = ['project_name', 'email']


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
    customer = models.CharField(
        max_length=256, blank=True, default='',
        help_text='Resolved customer bucket, used for Support Dashboard grouping.',
    )
    raised_by = models.EmailField(blank=True, default='')
    status = models.CharField(max_length=32, blank=True, default='')
    priority = models.CharField(max_length=32, blank=True, default='')
    opening_date = models.DateField(null=True, blank=True)
    is_internal = models.BooleanField(
        default=False,
        help_text='True if no customer could be resolved, or the resolved customer is explicitly internal.',
    )

    def __str__(self):
        return f'{self.erp_id} - {self.subject}'

    class Meta:
        ordering = ['-opening_date']
