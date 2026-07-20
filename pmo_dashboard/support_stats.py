import datetime
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from preferences import preferences

from pmo_dashboard.models import Issue

REVIEW_INTERVAL_DAYS = 14  # reviews happen every 14 days (Friday to Friday)
SPRINT_ACTIVE_DAYS = 11  # a sprint's active window: Monday after the previous review through this review Friday


def get_last_sprint_range(today: datetime.date = None) -> tuple:
    """Return the [start, end] date range of the most recently *completed* sprint.

    Reviews happen every REVIEW_INTERVAL_DAYS (14) days, always on the same weekday
    as `TimesheetPreferences.sprint_review_anchor` (a known review Friday). A sprint's
    own active window isn't the full 14 days between reviews though -- work resumes
    the Monday after a review (skipping that weekend) and runs through the next
    review Friday, which is SPRINT_ACTIVE_DAYS (11) days.

    If `today` falls inside a sprint that's still in progress, this returns the
    *previous* sprint (the one already reviewed), not a rolling window from today.
    """
    if today is None:
        today = timezone.localdate()

    anchor = preferences.TimesheetPreferences.sprint_review_anchor
    days_since_anchor = (today - anchor).days
    sprint_index = days_since_anchor // REVIEW_INTERVAL_DAYS  # floor division: correct even when today < anchor
    sprint_end = anchor + timedelta(days=sprint_index * REVIEW_INTERVAL_DAYS)
    sprint_start = sprint_end - timedelta(days=SPRINT_ACTIVE_DAYS)
    return sprint_start, sprint_end


def get_issue_summary(scope: str = 'all') -> list:
    """Return per-customer issue counts (total, low/medium/high, closed), excluding internal issues.

    Grouped by the Issue's resolved `customer` bucket rather than its ERPNext Project,
    since several distinct Projects can belong to the same customer (see
    _resolve_issue_customer in timesheet/utils/erp.py).

    scope='sprint' restricts to issues opened within the most recently completed
    sprint, per get_last_sprint_range().
    """
    qs = Issue.objects.filter(is_internal=False).exclude(customer='')
    if scope == 'sprint':
        start, end = get_last_sprint_range()
        qs = qs.filter(opening_date__gte=start, opening_date__lte=end)

    rows = qs.values('customer').annotate(
        total=Count('id'),
        low=Count('id', filter=Q(priority__iexact='Low')),
        medium=Count('id', filter=Q(priority__iexact='Medium')),
        high=Count('id', filter=Q(priority__iexact='High')),
        closed=Count('id', filter=Q(status__iexact='Closed')),
    ).order_by('-total')

    return [
        {
            'customer': row['customer'],
            'total': row['total'],
            'low': row['low'],
            'medium': row['medium'],
            'high': row['high'],
            'closed': row['closed'],
        }
        for row in rows
    ]
