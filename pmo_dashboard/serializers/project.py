from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from pmo_dashboard.status_rules import evaluate_status, get_status_label
from timesheet.models.project import Project
from timesheet.models.task import Task


def _user_display(user):
    if not user:
        return None
    full_name = user.get_full_name()
    return full_name if full_name.strip() else user.email




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
    status_label = serializers.SerializerMethodField()
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
            'status', 'status_label', 'rag', 'start_date', 'due_date',
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
        return evaluate_status(obj)

    @extend_schema_field(OpenApiTypes.STR)
    def get_status_label(self, obj):
        return get_status_label(evaluate_status(obj))

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
