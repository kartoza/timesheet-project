from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from pmo_dashboard.models import ContractTracker
from pmo_dashboard.status_rules import compute_contract_status


class ContractTrackerSerializer(serializers.ModelSerializer):
    client = serializers.CharField(source='project.customer', allow_null=True)
    project = serializers.CharField(source='project.name')
    contract_type = serializers.SerializerMethodField()
    start_date = serializers.DateField(source='project.expected_start_date', allow_null=True)
    end_date = serializers.DateField(source='project.expected_end_date', allow_null=True)
    contact = serializers.CharField(source='contact_email', allow_blank=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = ContractTracker
        fields = ['id', 'client', 'project', 'contract_type', 'start_date', 'end_date', 'contact', 'status']

    @extend_schema_field(OpenApiTypes.STR)
    def get_contract_type(self, obj):
        return obj.get_sla_type_display() if obj.sla_type else None

    @extend_schema_field({
        'type': 'string',
        'enum': ['Open', 'Expires in 3 Months', 'Expires in 2 Months', 'Expires in 1 Month', 'Closed'],
    })
    def get_status(self, obj):
        return compute_contract_status(obj.project.expected_end_date)
