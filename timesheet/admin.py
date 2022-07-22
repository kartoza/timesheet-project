from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from timesheet.enums.doctype import DocType
from timesheet.models import Timelog, Task, Project, Activity
from timesheet.utils.erp import push_timesheet_to_erp, get_erp_data
from timesheet.models.profile import Profile
from timesheet.models.user_project import UserProject
from timesheet.forms import ProfileForm


@admin.action(description='Push to ERP')
def push_to_erp(modeladmin, request, queryset: Timelog.objects):
    queryset = queryset.filter(submitted=False)
    push_timesheet_to_erp(queryset, request.user)


@admin.action(description='Pull projects')
def pull_projects(modeladmin, request, queryset: get_user_model()):
    for user in queryset:
        if not user.profile.token:
            continue
        projects = get_erp_data(
            DocType.PROJECT, user.profile.token)
        for project in projects:
            _project, _ = Project.objects.get_or_create(
                name=project['name'],
                defaults={
                    'is_active': project['is_active'] == 'Yes'
                }
            )
            UserProject.objects.get_or_create(
                user=user,
                project=_project
            )
        tasks = get_erp_data(
            DocType.TASK, user.profile.token
        )
        for task in tasks:
            try:
                project = Project.objects.get(name=task['project'])
            except Project.DoesNotExist:
                continue
            Task.objects.get_or_create(
                project=project,
                name=task['subject'],
                erp_id=task['name']
            )

        activities = get_erp_data(
            DocType.ACTIVITY, user.profile.token)

        for activity in activities:
            if 'name' not in activity:
                continue
            Activity.objects.get_or_create(
                name=activity['name']
            )


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
        'task'
    )
    actions = [push_to_erp]


class TaskAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'project'
    )


class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'is_active'
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
    actions = [pull_projects, ]


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
