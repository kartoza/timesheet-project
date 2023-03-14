from django.contrib import admin

from schedule.models import (
    UserProjectSlot,
    Schedule,
    PublicTimeline
)


class UserProjectSlotAdmin(admin.ModelAdmin):
    list_display = (
        'project',
        'user',
        'active'
    )
    raw_id_fields = (
        'project',
    )
    search_fields = (
        'project__name',
    )


class ScheduleAdmin(admin.ModelAdmin):
    list_display = (
        'user_project',
        'start_time',
        'end_time'
    )
    raw_id_fields = (
        'task',
    )


class PublicTimelineAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'start_time',
        'end_time',
        'active'
    )


admin.site.register(UserProjectSlot, UserProjectSlotAdmin)
admin.site.register(Schedule, ScheduleAdmin)
admin.site.register(PublicTimeline, PublicTimelineAdmin)
