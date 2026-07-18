from django.contrib import admin

from pmo_dashboard.models import BusinessUnit, ContractTracker


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
