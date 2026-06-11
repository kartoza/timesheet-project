import logging

from django.utils import timezone
from preferences import preferences

from timesheet.models.preferences import (
    FIXED_PMO_STATUS_KEYS,
    get_default_pmo_status_config,
    validate_pmo_status_config,
)

logger = logging.getLogger(__name__)


def _normalize_rag(value):
    return (value or '').strip().upper().replace(' ', '_')


def _ratio(value, total):
    if value is None or total is None or total <= 0:
        return None
    return value / total


def build_project_facts(project):
    today = timezone.localdate()
    due_date = project.expected_end_date
    return {
        'is_active': bool(project.is_active),
        'rag_normalized': _normalize_rag(project.rag),
        'behind_schedule': due_date is not None and due_date < today,
        'due_in_future': due_date is not None and due_date > today,
        'hours_ratio': _ratio(project.actual_time, project.expected_time),
        'cost_ratio': _ratio(project.total_costing_amount, project.total_sales_amount),
        'over_budget': (
            project.actual_time is not None
            and project.expected_time is not None
            and project.expected_time > 0
            and project.actual_time > project.expected_time
        ),
    }


def _normalize_config(config):
    labels = {
        status['key']: status['label'].strip()
        for status in config['statuses']
    }
    return {
        'labels': labels,
        'rules': config.get('rules', []),
        'default_status': config['default_status'],
    }


def get_effective_status_config():
    default_config = get_default_pmo_status_config()
    current_config = getattr(preferences.TimesheetPreferences, 'pmo_status_config', None)
    try:
        if current_config is None:
            return _normalize_config(default_config)
        validate_pmo_status_config(current_config)
        return _normalize_config(current_config)
    except Exception:
        logger.exception('Invalid PMO status config; using defaults.')
        return _normalize_config(default_config)


def _compare(left, op, right=None):
    if op == 'eq':
        return left == right
    if op == 'neq':
        return left != right
    if op == 'gt':
        return left is not None and left > right
    if op == 'gte':
        return left is not None and left >= right
    if op == 'lt':
        return left is not None and left < right
    if op == 'lte':
        return left is not None and left <= right
    if op == 'in':
        return left in right
    if op == 'not_in':
        return left not in right
    if op == 'is_true':
        return left is True
    if op == 'is_false':
        return left is False
    if op == 'exists':
        expected = True if right is None else bool(right)
        return (left is not None) is expected
    return False


def _matches_condition(facts, condition):
    if 'all' in condition:
        return all(_matches_condition(facts, child) for child in condition['all'])
    if 'any' in condition:
        return any(_matches_condition(facts, child) for child in condition['any'])

    field = condition['field']
    op = condition['op']
    value = condition.get('value')
    return _compare(facts.get(field), op, value)


def _collect_ratio_thresholds(config):
    """Walk all rule conditions and collect gte/gt thresholds for numeric ratio fields."""
    thresholds = {}

    def walk(condition):
        if 'all' in condition:
            for child in condition['all']:
                walk(child)
        elif 'any' in condition:
            for child in condition['any']:
                walk(child)
        else:
            field = condition.get('field')
            op = condition.get('op')
            value = condition.get('value')
            if field and op in ('gte', 'gt') and isinstance(value, (int, float)):
                thresholds.setdefault(field, set()).add(value)

    for rule in config['rules']:
        walk(rule['when'])
    return thresholds


def get_status_reasons(project):
    """Return a list of human-readable reason strings explaining why a project has its status."""
    config = get_effective_status_config()
    facts = build_project_facts(project)
    thresholds = _collect_ratio_thresholds(config)
    reasons = []

    if facts.get('behind_schedule'):
        reasons.append('Behind Schedule')

    if facts.get('over_budget'):
        reasons.append('Budget Overrun')
    else:
        hours_ratio = facts.get('hours_ratio')
        if hours_ratio is not None:
            crossed = sorted(t for t in thresholds.get('hours_ratio', []) if hours_ratio >= t)
            if crossed:
                reasons.append(f'Hours at {int(crossed[0] * 100)}%+')

    cost_ratio = facts.get('cost_ratio')
    if cost_ratio is not None:
        crossed = sorted(t for t in thresholds.get('cost_ratio', []) if cost_ratio >= t)
        if crossed:
            reasons.append(f'Cost at {int(crossed[0] * 100)}%+')

    return reasons


def evaluate_status(project):
    config = get_effective_status_config()
    facts = build_project_facts(project)

    for rule in config['rules']:
        if _matches_condition(facts, rule['when']):
            status = rule['status']
            if status in FIXED_PMO_STATUS_KEYS:
                return status

    fallback_status = config['default_status']
    if fallback_status in FIXED_PMO_STATUS_KEYS:
        return fallback_status
    return 'on_track'


def get_status_label(status_key):
    config = get_effective_status_config()
    return config['labels'].get(status_key, status_key.replace('_', ' ').title())
