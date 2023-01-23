from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from preferences.admin import PreferencesAdmin


from timesheet.models import Timelog, Task, Project, Activity, TimesheetPreferences
from timesheet.models.clock import Clock
from timesheet.utils.erp import (
    push_timesheet_to_erp, pull_projects_from_erp, pull_user_data_from_erp
)
from timesheet.models.profile import Profile
from timesheet.models.user_project import UserProject
from timesheet.forms import ProfileForm


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
    )


class TaskAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'project',
        'actual_time',
        'expected_time'
    )
    search_fields = (
        'name',
        'project__name'
    )


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


class ActivityAdmin(admin.ModelAdmin):
    list_display = (
        'name',
    )


class ProfileInLine(admin.StackedInline):
    model = Profile
    form = ProfileForm


class UserAdmin(DjangoUserAdmin):
    inlines = [ProfileInLine, ]
    actions = [pull_projects, pull_user_data]


class UserProjectAdmin(admin.ModelAdmin):
    list_display = (
        'project',
        'user'
    )


admin.site.register(Timelog, TimelogAdmin)
admin.site.register(Task, TaskAdmin)
admin.site.register(Project, ProjectAdmin)
admin.site.register(Activity, ActivityAdmin)
admin.site.unregister(get_user_model())
admin.site.register(get_user_model(), UserAdmin)
admin.site.register(UserProject, UserProjectAdmin)
admin.site.register(TimesheetPreferences, PreferencesAdmin)
admin.site.register(Clock)
