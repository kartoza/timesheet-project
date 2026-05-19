from django.contrib import admin

from pmo_dashboard.models import BusinessUnit


@admin.register(BusinessUnit)
class BusinessUnitAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)
