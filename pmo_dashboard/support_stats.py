from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone

from pmo_dashboard.models import Issue

SPRINT_DAYS = 14


def get_issue_summary(scope: str = 'all') -> list:
    """Return per-project issue counts (total, low/medium/high, closed), excluding internal issues.

    scope='sprint' restricts to issues opened in the last SPRINT_DAYS days.
    """
    qs = Issue.objects.filter(is_internal=False, project__isnull=False)
    if scope == 'sprint':
        cutoff = timezone.localdate() - timedelta(days=SPRINT_DAYS)
        qs = qs.filter(opening_date__gte=cutoff)

    rows = qs.values('project__id', 'project__name').annotate(
        total=Count('id'),
        low=Count('id', filter=Q(priority__iexact='Low')),
        medium=Count('id', filter=Q(priority__iexact='Medium')),
        high=Count('id', filter=Q(priority__iexact='High')),
        closed=Count('id', filter=Q(status__iexact='Closed')),
    ).order_by('-total')

    return [
        {
            'project': row['project__name'],
            'total': row['total'],
            'low': row['low'],
            'medium': row['medium'],
            'high': row['high'],
            'closed': row['closed'],
        }
        for row in rows
    ]
