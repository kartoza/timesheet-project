from rest_framework import serializers
from timesheet.models import Timelog


class TimelogSerializer(serializers.ModelSerializer):
    owner = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    project = serializers.SerializerMethodField()
    project_id = serializers.SerializerMethodField()
    task = serializers.SerializerMethodField()
    activity_type = serializers.SerializerMethodField()
    activity_id = serializers.SerializerMethodField()
    from_time = serializers.SerializerMethodField()
    to_time = serializers.SerializerMethodField()
    hours = serializers.SerializerMethodField()
    doctype = serializers.SerializerMethodField()
    is_billable = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    task_name = serializers.SerializerMethodField()
    task_id = serializers.SerializerMethodField()
    running = serializers.SerializerMethodField()

    def get_running(self, obj: Timelog):
        if not obj.end_time:
            return True
        return False

    def get_task_name(self, obj: Timelog):
        if obj.task:
            return obj.task.name
        return ''

    def get_task_id(self, obj: Timelog):
        if obj.task:
            return obj.task.id
        return ''

    def get_is_billable(self, obj):
        return 0

    def get_doctype(self, obj):
        return 'Timelog Detail'

    def get_task(self, obj: Timelog):
        if obj.task:
            return obj.task.erp_id
        return ''

    def get_project_name(self, obj: Timelog):
        if obj.task:
            return obj.task.project.name
        return 'Kartoza'

    def get_project(self, obj: Timelog):
        if obj.task:
            return obj.task.project.name
        return ''

    def get_project_id(self, obj: Timelog):
        if obj.task:
            return obj.task.project.id
        return ''

    def get_owner_name(self, obj):
        if obj.user.first_name:
            return f'{obj.user.first_name} {obj.user.last_name}'
        return obj.user.username

    def get_owner(self, obj):
        return obj.user.email

    def get_activity_type(self, obj):
        return obj.activity.name if obj.activity else '-'

    def get_activity_id(self, obj):
        return obj.activity.id if obj.activity else ''

    def get_from_time(self, obj: Timelog):
        return obj.start_time.strftime('%Y-%m-%d %H:%M:%S')

    def get_to_time(self, obj: Timelog):
        if obj.end_time:
            return obj.end_time.strftime('%Y-%m-%d %H:%M:%S')
        return ''

    def get_hours(self, obj: Timelog):
        if obj.end_time and obj.start_time:
            return round(
                (obj.end_time - obj.start_time).total_seconds() / 3600, 2)
        return 0

    class Meta:
        model = Timelog
        fields = [
            'id',
            'description',
            'activity_type',
            'owner',
            'project_name',
            'project',
            'project_id',
            'task',
            'task_name',
            'task_id',
            'activity_id',
            'from_time',
            'to_time',
            'hours',
            'doctype',
            'is_billable',
            'owner_name',
            'running'
        ]
