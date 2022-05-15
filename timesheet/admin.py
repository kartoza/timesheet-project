from django.contrib import admin

from timesheet.models import Timelog, Task, Project, Activity
from timesheet.utils.erp import push_timesheet_to_erp


@admin.action(description='Push to ERP')
def push_to_erp(modeladmin, request, queryset: Timelog.objects):
    queryset = queryset.filter(submitted=False)
    push_timesheet_to_erp(queryset)


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


admin.site.register(Timelog, TimelogAdmin)
admin.site.register(Task, TaskAdmin)
admin.site.register(Project, ProjectAdmin)
admin.site.register(Activity, ActivityAdmin)
