from django.contrib import admin

from timesheet.models import Timesheet, Task


class TimesheetAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'task',
        'start_time',
        'end_time'
    )
    list_filter = (
        'user',
        'task'
    )


class TaskAdmin(admin.ModelAdmin):
    list_display = (
        'name',
    )


admin.site.register(Timesheet, TimesheetAdmin)
admin.site.register(Task, TaskAdmin)
