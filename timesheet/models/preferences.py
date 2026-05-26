from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.db import models
from preferences.models import Preferences

import pytz

TIMEZONES = tuple(zip(pytz.all_timezones, pytz.all_timezones))
FIXED_PMO_STATUS_KEYS = {
    'on_track',
    'warning',
    'at_risk',
    'overdue',
    'on_hold',
    'completed',
}
ALLOWED_PMO_RULE_FIELDS = {
    'is_active',
    'rag_normalized',
    'behind_schedule',
    'due_in_future',
    'hours_ratio',
    'cost_ratio',
    'over_budget',
}
ALLOWED_PMO_RULE_OPERATORS = {
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
    'not_in',
    'is_true',
    'is_false',
    'exists',
}


def get_default_pmo_status_config():
    return {
        'version': 1,
        'statuses': [
            {'key': 'on_track', 'label': 'On track'},
            {'key': 'warning', 'label': 'Warning'},
            {'key': 'at_risk', 'label': 'At risk'},
            {'key': 'overdue', 'label': 'Overdue'},
            {'key': 'on_hold', 'label': 'On hold'},
            {'key': 'completed', 'label': 'Completed'},
        ],
        'default_status': 'on_track',
        'rules': [
            {
                'status': 'completed',
                'when': {
                    'all': [
                        {'field': 'is_active', 'op': 'eq', 'value': False},
                    ],
                },
            },
            {
                'status': 'on_hold',
                'when': {
                    'all': [
                        {'field': 'rag_normalized', 'op': 'in', 'value': ['ON_HOLD', 'HOLD']},
                    ],
                },
            },
            {
                'status': 'overdue',
                'when': {
                    'all': [
                        {'field': 'behind_schedule', 'op': 'eq', 'value': True},
                        {'field': 'over_budget', 'op': 'eq', 'value': True},
                        {'field': 'cost_ratio', 'op': 'lt', 'value': 0.7},
                    ],
                },
            },
            {
                'status': 'at_risk',
                'when': {
                    'any': [
                        {'field': 'behind_schedule', 'op': 'eq', 'value': True},
                        {'field': 'over_budget', 'op': 'eq', 'value': True},
                        {'field': 'cost_ratio', 'op': 'gt', 'value': 0.9},
                    ],
                },
            },
            {
                'status': 'warning',
                'when': {
                    'any': [
                        {'field': 'hours_ratio', 'op': 'gte', 'value': 0.9},
                        {'field': 'cost_ratio', 'op': 'gte', 'value': 0.7},
                    ],
                },
            },
        ],
    }


def _validate_condition(condition, path='when'):
    if not isinstance(condition, dict):
        raise ValidationError(f'{path} must be an object.')

    has_all = 'all' in condition
    has_any = 'any' in condition

    if has_all or has_any:
        if has_all and has_any:
            raise ValidationError(f'{path} cannot contain both "all" and "any".')
        branch_key = 'all' if has_all else 'any'
        branch = condition.get(branch_key)
        if not isinstance(branch, list) or not branch:
            raise ValidationError(f'{path}.{branch_key} must be a non-empty list.')
        for idx, item in enumerate(branch):
            _validate_condition(item, path=f'{path}.{branch_key}[{idx}]')
        return

    field = condition.get('field')
    op = condition.get('op')
    if field not in ALLOWED_PMO_RULE_FIELDS:
        raise ValidationError(f'{path}.field must be one of: {sorted(ALLOWED_PMO_RULE_FIELDS)}.')
    if op not in ALLOWED_PMO_RULE_OPERATORS:
        raise ValidationError(f'{path}.op must be one of: {sorted(ALLOWED_PMO_RULE_OPERATORS)}.')

    if op in {'is_true', 'is_false'}:
        if 'value' in condition:
            raise ValidationError(f'{path}.value is not allowed for "{op}" operator.')
        return

    if op == 'exists':
        if 'value' in condition and not isinstance(condition.get('value'), bool):
            raise ValidationError(f'{path}.value must be true or false for "exists" operator.')
        return

    if 'value' not in condition:
        raise ValidationError(f'{path}.value is required for "{op}" operator.')

    if op in {'in', 'not_in'} and not isinstance(condition.get('value'), list):
        raise ValidationError(f'{path}.value must be a list for "{op}" operator.')


def validate_pmo_status_config(config):
    if not isinstance(config, dict):
        raise ValidationError('PMO status config must be an object.')

    statuses = config.get('statuses')
    if not isinstance(statuses, list) or not statuses:
        raise ValidationError('PMO status config statuses must be a non-empty list.')

    parsed_keys = set()
    for idx, status in enumerate(statuses):
        if not isinstance(status, dict):
            raise ValidationError(f'statuses[{idx}] must be an object.')
        key = status.get('key')
        label = status.get('label')
        if key not in FIXED_PMO_STATUS_KEYS:
            raise ValidationError(
                f'statuses[{idx}].key must be one of: {sorted(FIXED_PMO_STATUS_KEYS)}.'
            )
        if not isinstance(label, str) or not label.strip():
            raise ValidationError(f'statuses[{idx}].label must be a non-empty string.')
        if key in parsed_keys:
            raise ValidationError(f'statuses[{idx}].key must not be duplicated.')
        parsed_keys.add(key)

    if parsed_keys != FIXED_PMO_STATUS_KEYS:
        raise ValidationError(
            'PMO status config statuses must include each fixed key exactly once.'
        )

    default_status = config.get('default_status')
    if default_status not in FIXED_PMO_STATUS_KEYS:
        raise ValidationError(
            f'default_status must be one of: {sorted(FIXED_PMO_STATUS_KEYS)}.'
        )

    rules = config.get('rules')
    if not isinstance(rules, list):
        raise ValidationError('PMO status config rules must be a list.')

    for idx, rule in enumerate(rules):
        if not isinstance(rule, dict):
            raise ValidationError(f'rules[{idx}] must be an object.')
        status = rule.get('status')
        if status not in FIXED_PMO_STATUS_KEYS:
            raise ValidationError(
                f'rules[{idx}].status must be one of: {sorted(FIXED_PMO_STATUS_KEYS)}.'
            )
        if 'when' not in rule:
            raise ValidationError(f'rules[{idx}].when is required.')
        _validate_condition(rule['when'], path=f'rules[{idx}].when')


class TimesheetPreferences(Preferences):
    admin_token = models.CharField(
        max_length=200,
        default=''
    )

    map_api_key = models.CharField(
        max_length=200,
        default=''
    )

    erp_timezone = models.CharField(
        max_length=100,
        choices=TIMEZONES,
        default='',
        blank=True
    )

    unavailable_dates = models.TextField(
        default='',
        blank=True,
        help_text=(
            'Enter the dates when timesheet submission is not available, separated by commas. '
            'E.g., "2023-12-24,2023-12-25". On these dates, users will not be able to submit timesheet.'
        )
    )

    pmo_allowed_groups = models.ManyToManyField(
        Group,
        blank=True,
        related_name='pmo_allowed_preferences',
        help_text='Groups allowed to access the PMO Dashboard.',
    )

    pmo_status_config = models.JSONField(
        default=get_default_pmo_status_config,
        help_text='Configurable PMO status labels and formulas. Keys are fixed: on_track, warning, at_risk, overdue, on_hold, completed.',
    )

    def clean(self):
        super().clean()
        try:
            validate_pmo_status_config(self.pmo_status_config)
        except ValidationError as exc:
            message = '; '.join(exc.messages) if getattr(exc, 'messages', None) else str(exc)
            raise ValidationError({'pmo_status_config': message}) from exc
