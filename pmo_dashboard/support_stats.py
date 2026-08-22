import datetime
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from preferences import preferences

from pmo_dashboard.models import Issue

REVIEW_INTERVAL_DAYS = 14  # reviews happen every 14 days (Friday to Friday)
SPRINT_ACTIVE_DAYS = REVIEW_INTERVAL_DAYS - 1  # the day after the previous review through this review (inclusive)


def get_last_sprint_range(today: datetime.date = None) -> tuple:
    """Return the [start, end] date range of the *current* sprint (the one still in
    progress, that will next be reviewed) -- not the previously completed one.

    Reviews happen every REVIEW_INTERVAL_DAYS (14) days, always on the same weekday
    as `TimesheetPreferences.sprint_review_anchor` (a known review Friday). A sprint's
    active window runs from the day right after the previous review through this
    sprint's review date, inclusive -- deliberately not skipping the weekend right
    after a review, since a ticket reported on a Saturday/Sunday still needs to be
    counted.

    If `today` lands exactly on a review date, that date is treated as the end of
    the sprint concluding that day (not the start of the next one).
    """
    if today is None:
        today = timezone.localdate()

    anchor = preferences.TimesheetPreferences.sprint_review_anchor
    days_since_anchor = (today - anchor).days
    sprint_index = -(-days_since_anchor // REVIEW_INTERVAL_DAYS)  # ceil division: next review >= today
    sprint_end = anchor + timedelta(days=sprint_index * REVIEW_INTERVAL_DAYS)
    sprint_start = sprint_end - timedelta(days=SPRINT_ACTIVE_DAYS)
    return sprint_start, sprint_end


def get_issue_summary(scope: str = 'all') -> list:
    """Return per-customer issue counts (total, low/medium/high, closed), excluding internal issues.

    Grouped by the Issue's resolved `customer` bucket rather than its ERPNext Project,
    since several distinct Projects can belong to the same customer (see
    _resolve_issue_customer in timesheet/utils/erp.py).

    scope='sprint' restricts to issues opened within the current sprint (the one
    still in progress), per get_last_sprint_range().
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
        resolved=Count('id', filter=Q(status__iexact=Issue.STATUS_RESOLVED)),
        closed=Count('id', filter=Q(status__iexact=Issue.STATUS_CLOSED)),
    ).order_by('-total')

    return [
        {
            'customer': row['customer'],
            'total': row['total'],
            'low': row['low'],
            'medium': row['medium'],
            'high': row['high'],
            'resolved': row['resolved'],
            'closed': row['closed'],
        }
        for row in rows
    ]
