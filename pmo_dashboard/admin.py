import csv
import io

from django import forms
from django.contrib import admin, messages
from django.db import transaction
from django.http import HttpResponseRedirect
from django.template.response import TemplateResponse
from django.urls import path, reverse

from pmo_dashboard.models import BusinessUnit, ContractTracker, Issue, SupportContactMapping


class SupportContactMappingImportForm(forms.Form):
    MODE_UPDATE = 'update'
    MODE_REPLACE = 'replace'
    MODE_CHOICES = (
        (MODE_UPDATE, 'Update (upsert by email/project_name, keep rows not in the CSV)'),
        (MODE_REPLACE, 'Replace (delete all existing rows first)'),
    )

    csv_file = forms.FileField(label='CSV file')
    mode = forms.ChoiceField(choices=MODE_CHOICES, widget=forms.RadioSelect, initial=MODE_UPDATE)


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
    change_list_template = 'admin/pmo_dashboard/supportcontactmapping/change_list.html'

    def get_urls(self):
        urls = [
            path('import-csv/', self.admin_site.admin_view(self.import_csv_view), name='pmo_dashboard_supportcontactmapping_import_csv'),
        ]
        return urls + super().get_urls()

    def import_csv_view(self, request):
        if request.method == 'POST':
            form = SupportContactMappingImportForm(request.POST, request.FILES)
            if form.is_valid():
                try:
                    rows = self._parse_csv(request.FILES['csv_file'])
                except ValueError as e:
                    messages.error(request, str(e))
                    return TemplateResponse(request, 'admin/pmo_dashboard/supportcontactmapping/import_csv.html', {
                        'form': form, 'opts': self.model._meta, 'title': 'Import Support Contact Mapping',
                    })

                mode = form.cleaned_data['mode']
                with transaction.atomic():
                    if mode == SupportContactMappingImportForm.MODE_REPLACE:
                        SupportContactMapping.objects.all().delete()
                    created, updated = 0, 0
                    for row in rows:
                        _, was_created = SupportContactMapping.objects.update_or_create(
                            email=row['email'],
                            project_name=row['project_name'],
                            defaults={'customer': row['customer'], 'note': row['note']},
                        )
                        created += was_created
                        updated += not was_created

                messages.success(request, f'Imported {len(rows)} row(s): {created} created, {updated} updated.')
                return HttpResponseRedirect(reverse('admin:pmo_dashboard_supportcontactmapping_changelist'))
        else:
            form = SupportContactMappingImportForm()

        return TemplateResponse(request, 'admin/pmo_dashboard/supportcontactmapping/import_csv.html', {
            'form': form, 'opts': self.model._meta, 'title': 'Import Support Contact Mapping',
        })

    @staticmethod
    def _parse_csv(uploaded_file):
        text = io.TextIOWrapper(uploaded_file.file, encoding='utf-8-sig')
        reader = csv.DictReader(text)
        if not reader.fieldnames or not {'email', 'project_name'} <= set(reader.fieldnames):
            raise ValueError("CSV must have a header row with at least 'email' and 'project_name' columns.")

        rows = []
        for i, raw_row in enumerate(reader, start=2):
            email = (raw_row.get('email') or '').strip()
            project_name = (raw_row.get('project_name') or '').strip()
            if not email and not project_name:
                raise ValueError(f'Row {i}: must have either "email" or "project_name" set.')
            rows.append({
                'email': email,
                'project_name': project_name,
                'customer': (raw_row.get('customer') or '').strip(),
                'note': (raw_row.get('note') or '').strip(),
            })
        return rows
