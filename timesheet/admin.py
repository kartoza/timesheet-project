from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django import forms
from preferences.admin import PreferencesAdmin


from timesheet.models import (
    Timelog, Task, Project, Activity, TimesheetPreferences,
    SavedSummary, ProjectLink
)
from timesheet.models.clock import Clock
from timesheet.utils.erp import (
    push_timesheet_to_erp, pull_projects_from_erp, pull_user_data_from_erp,
    pull_leave_data_from_erp, pull_holiday_list
)
from timesheet.models.profile import Profile
from timesheet.models.user_project import UserProject
from timesheet.forms import ProfileForm


class TimesheetPreferencesForm(forms.ModelForm):
    class Meta:
        model = TimesheetPreferences
        fields = '__all__'
        widgets = {
            'map_api_key': forms.PasswordInput(render_value=True),
            'admin_token': forms.PasswordInput(render_value=True),
        }


@admin.action(description='Push to ERP')
def push_to_erp(modeladmin, request, queryset: Timelog.objects):
    queryset = queryset.filter(submitted=False)
    if queryset.exists():
        user = queryset.first().user
        push_timesheet_to_erp(queryset, user)


@admin.action(description='Pull projects')
def pull_projects(modeladmin, request, queryset: get_user_model()):
    for user in queryset:
        if not user.profile.token:
            continue
        pull_projects_from_erp(user)


@admin.action(description='Pull user data')
def pull_user_data(modeladmin, request, queryset: get_user_model()):
    for user in queryset:
        if not user.profile.token:
            continue
        pull_user_data_from_erp(user)


@admin.action(description='Pull leave data')
def pull_leave_data(modeladmin, request, queryset: get_user_model()):
    for user in queryset:
        if not user.profile.token:
            continue
        pull_leave_data_from_erp(user)
        pull_holiday_list(user)


class TimelogAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'activity',
        'task',
        'start_time',
        'end_time',
        'submitted'
    )
    list_filter = (
        'user',
        'submitted'
    )
    actions = [push_to_erp]
    raw_id_fields = (
        'task',
        'project',
        'parent',
    )


class TaskAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'project',
        'actual_time',
        'expected_time',
        'last_update'
    )
    readonly_fields = (
        'last_update',
    )
    search_fields = (
        'name',
        'project__name'
    )


class ProjectLinkInline(admin.StackedInline):
    model = ProjectLink
    extra = 1
    fields = ('name', 'link', 'display_order')
    ordering = ('display_order',)


class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'is_active'
    )
    search_fields = (
        'name',
    )
    list_filter = (
        'is_active',
    )
    inlines = (
        ProjectLinkInline,
    )


class ActivityAdmin(admin.ModelAdmin):
    list_display = (
        'name',
    )


class ProfileInLine(admin.StackedInline):
    model = Profile
    form = ProfileForm


class UserAdmin(DjangoUserAdmin):
    inlines = [ProfileInLine, ]
    actions = [pull_projects, pull_user_data, pull_leave_data]


class SavedSummaryAdmin(admin.ModelAdmin):
    raw_id_fields = ['project']
    list_display = [
        'name',
        'active',
        'last_updated'
    ]


class UserProjectAdmin(admin.ModelAdmin):
    list_display = (
        'project',
        'user'
    )


class TimesheetPreferencesAdmin(PreferencesAdmin):
    form = TimesheetPreferencesForm


admin.site.register(Timelog, TimelogAdmin)
admin.site.register(Task, TaskAdmin)
admin.site.register(Project, ProjectAdmin)
admin.site.register(Activity, ActivityAdmin)
admin.site.unregister(get_user_model())
admin.site.register(get_user_model(), UserAdmin)
admin.site.register(UserProject, UserProjectAdmin)
admin.site.register(TimesheetPreferences, TimesheetPreferencesAdmin)
admin.site.register(Clock)
admin.site.register(SavedSummary, SavedSummaryAdmin)
