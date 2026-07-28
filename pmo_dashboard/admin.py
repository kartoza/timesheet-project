from django.contrib import admin

from pmo_dashboard.models import BusinessUnit, ContractTracker, Issue, SupportContactMapping


@admin.register(BusinessUnit)
class BusinessUnitAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(ContractTracker)
class ContractTrackerAdmin(admin.ModelAdmin):
    list_display = ('project', 'sla_type', 'contact_email')
    list_filter = ('sla_type',)
    search_fields = ('project__name', 'contact_email')
    autocomplete_fields = ('project',)


@admin.register(Issue)
class IssueAdmin(admin.ModelAdmin):
    list_display = ('erp_id', 'subject', 'project', 'customer', 'priority', 'status', 'opening_date', 'is_internal')
    list_filter = ('is_internal', 'priority', 'status')
    search_fields = ('erp_id', 'subject', 'raised_by', 'customer')
    autocomplete_fields = ('project',)


@admin.register(SupportContactMapping)
class SupportContactMappingAdmin(admin.ModelAdmin):
    list_display = ('email', 'project_name', 'customer', 'note')
    search_fields = ('email', 'project_name', 'customer')
