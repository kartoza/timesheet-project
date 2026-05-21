from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers
from django.utils import timezone

from timesheet.models.project import Project
from timesheet.models.task import Task

WARNING_HOURS_THRESHOLD = 0.9
WARNING_COST_THRESHOLD = 0.7
AT_RISK_COST_THRESHOLD = 0.9


def _user_display(user):
    if not user:
        return None
    full_name = user.get_full_name()
    return full_name if full_name.strip() else user.email


def _is_on_hold(obj):
    rag = (obj.rag or '').strip().upper().replace(' ', '_')
    return rag in {'ON_HOLD', 'HOLD'}


def _is_ratio_greater_than(value, total, threshold):
    if value is None or total is None or total <= 0:
        return False
    return value > (total * threshold)


def _is_ratio_greater_or_equal(value, total, threshold):
    if value is None or total is None or total <= 0:
        return False
    return value >= (total * threshold)


def _is_over_budget(consumed_time, budget_hours):
    if consumed_time is None or budget_hours is None or budget_hours <= 0:
        return False
    return consumed_time > budget_hours


def _is_budget_warning(consumed_time, budget_hours):
    return _is_ratio_greater_or_equal(consumed_time, budget_hours, WARNING_HOURS_THRESHOLD)


def _calculate_status(obj):
    if not obj.is_active:
        return 'completed'

    if _is_on_hold(obj):
        return 'on_hold'

    today = timezone.localdate()
    due_date = obj.expected_end_date
    behind_schedule = due_date is not None and due_date < today
    due_in_future = due_date is not None and due_date > today

    over_budget = _is_over_budget(obj.actual_time, obj.expected_time)
    budget_warning = _is_budget_warning(obj.actual_time, obj.expected_time)
    cost_warning = _is_ratio_greater_or_equal(
        obj.total_costing_amount,
        obj.total_sales_amount,
        WARNING_COST_THRESHOLD,
    )
    cost_at_risk = _is_ratio_greater_than(
        obj.total_costing_amount,
        obj.total_sales_amount,
        AT_RISK_COST_THRESHOLD,
    )
    cost_under_overdue_limit = (
        obj.total_costing_amount is not None
        and obj.total_sales_amount is not None
        and obj.total_sales_amount > 0
        and obj.total_costing_amount < (obj.total_sales_amount * WARNING_COST_THRESHOLD)
    )

    if behind_schedule and over_budget and cost_under_overdue_limit:
        return 'overdue'

    if behind_schedule or over_budget or cost_at_risk:
        return 'at_risk'

    if budget_warning or cost_warning:
        return 'warning'

    on_track = (
        due_in_future
        and obj.actual_time is not None
        and obj.expected_time is not None
        and obj.expected_time > 0
        and obj.actual_time < obj.expected_time
        and obj.total_costing_amount is not None
        and obj.total_sales_amount is not None
        and obj.total_sales_amount > 0
        and obj.total_costing_amount < obj.total_sales_amount
    )
    if on_track:
        return 'on_track'

    return 'on_track'


class TeamMemberSerializer(serializers.Serializer):
    id = serializers.IntegerField(source='user.id')
    name = serializers.SerializerMethodField()
    role = serializers.CharField()
    is_lead = serializers.BooleanField(source='project_lead')

    @extend_schema_field(OpenApiTypes.STR)
    def get_name(self, obj):
        full_name = obj.user.get_full_name()
        return full_name if full_name.strip() else obj.user.email


class SubtaskSerializer(serializers.ModelSerializer):
    budget_time = serializers.FloatField(source='expected_time', allow_null=True)
    consumed_time = serializers.FloatField(source='actual_time', allow_null=True)

    class Meta:
        model = Task
        fields = ['id', 'name', 'budget_time', 'consumed_time']


class ProjectSerializer(serializers.ModelSerializer):
    business_unit = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    rag = serializers.SerializerMethodField()
    start_date = serializers.DateField(source='expected_start_date')
    due_date = serializers.DateField(source='expected_end_date')
    project_manager = serializers.SerializerMethodField()
    relations_manager = serializers.SerializerMethodField()
    budget_hours = serializers.FloatField(source='expected_time', allow_null=True)
    consumed_time = serializers.FloatField(source='actual_time', allow_null=True)
    actual_progress = serializers.SerializerMethodField()
    total_costing = serializers.FloatField(source='total_costing_amount', allow_null=True)
    team_members = serializers.SerializerMethodField()
    subtasks = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'business_unit', 'project_type', 'customer',
            'status', 'rag', 'start_date', 'due_date',
            'project_manager', 'relations_manager',
            'budget_hours', 'consumed_time', 'progress_in_hours',
            'actual_progress', 'estimated_costing', 'total_sales_amount',
            'total_costing', 'total_billable_amount', 'total_billed_amount',
            'gross_margin', 'per_gross_margin',
            'team_members', 'subtasks',
        ]

    @extend_schema_field(OpenApiTypes.STR)
    def get_business_unit(self, obj):
        return obj.business_unit.name if obj.business_unit else None

    @extend_schema_field(OpenApiTypes.STR)
    def get_customer(self, obj):
        return obj.customer or None

    @extend_schema_field({'type': 'string', 'enum': ['on_track', 'warning', 'at_risk', 'overdue', 'on_hold', 'completed']})
    def get_status(self, obj):
        return _calculate_status(obj)

    @extend_schema_field(OpenApiTypes.STR)
    def get_rag(self, obj):
        return obj.rag or None

    @extend_schema_field(OpenApiTypes.STR)
    def get_project_manager(self, obj):
        return _user_display(obj.project_lead)

    @extend_schema_field(OpenApiTypes.STR)
    def get_relations_manager(self, obj):
        return _user_display(obj.relations_manager)

    @extend_schema_field(OpenApiTypes.FLOAT)
    def get_actual_progress(self, obj):
        percent = obj.percent_complete
        return (percent / 100) if percent is not None else None

    @extend_schema_field(TeamMemberSerializer(many=True))
    def get_team_members(self, obj):
        members = [m for m in obj.members.all() if m.user]
        return TeamMemberSerializer(members, many=True).data

    @extend_schema_field(SubtaskSerializer(many=True))
    def get_subtasks(self, obj):
        return SubtaskSerializer(obj.task_set.filter(active=True), many=True).data
