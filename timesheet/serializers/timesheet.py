import re
import html2text

from rest_framework import serializers
from timesheet.models import Timelog


class TimelogSerializer(serializers.ModelSerializer):
    owner = serializers.SerializerMethodField()
    project_name = serializers.SerializerMethodField()
    project_active = serializers.SerializerMethodField()
    project = serializers.SerializerMethodField()
    project_id = serializers.SerializerMethodField()
    task = serializers.SerializerMethodField()
    activity_type = serializers.SerializerMethodField()
    activity_id = serializers.SerializerMethodField()
    all_from_time = serializers.SerializerMethodField()
    all_to_time = serializers.SerializerMethodField()
    all_hours = serializers.SerializerMethodField()
    from_time = serializers.SerializerMethodField()
    to_time = serializers.SerializerMethodField()
    hours = serializers.SerializerMethodField()
    doctype = serializers.SerializerMethodField()
    is_billable = serializers.SerializerMethodField()
    owner_name = serializers.SerializerMethodField()
    task_name = serializers.SerializerMethodField()
    task_id = serializers.SerializerMethodField()
    running = serializers.SerializerMethodField()
    employee_name = serializers.SerializerMethodField()
    employee = serializers.SerializerMethodField()
    total_children = serializers.SerializerMethodField()

    def get_project_active(self, obj: Timelog):
        if obj.task:
            return obj.task.project.is_active
        return True

    def get_employee(self, obj: Timelog):
        return obj.user.profile.employee_id

    def get_employee_name(self, obj: Timelog):
        if obj.user.profile.employee_name:
            return obj.user.profile.employee_name
        if obj.user.first_name:
            return f'{obj.user.first_name} {obj.user.last_name}'
        return ''

    def get_running(self, obj: Timelog):
        if not obj.end_time:
            return True
        return False

    def get_task_name(self, obj: Timelog):
        if obj.task:
            return re.sub(' +', ' ',
                f'{obj.task.name} ({round(obj.task.actual_time, 2)}/{round(obj.task.expected_time, 2)})'
            )
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

    def get_all_from_time(self, obj: Timelog):
        children = obj.children.all().order_by('start_time')
        last_child_start_time = (
            children.first().start_time if children.exists() else None
        )
        if last_child_start_time and last_child_start_time < obj.start_time:
            return last_child_start_time.strftime('%Y-%m-%d %H:%M:%S')
        elif obj.start_time:
            return obj.start_time.strftime('%Y-%m-%d %H:%M:%S')
        else:
            return ''

    def get_all_to_time(self, obj: Timelog):
        children = obj.children.all().order_by('-end_time')
        last_child_end_time = (
            children.first().end_time if children.exists() else None
        )
        if last_child_end_time and last_child_end_time > obj.end_time:
            return last_child_end_time.strftime('%Y-%m-%d %H:%M:%S')
        elif obj.end_time:
            return obj.end_time.strftime('%Y-%m-%d %H:%M:%S')
        else:
            return ''

    def get_from_time(self, obj: Timelog):
        return obj.start_time.strftime('%Y-%m-%d %H:%M:%S')

    def get_to_time(self, obj: Timelog):
        if obj.end_time:
            return obj.end_time.strftime('%Y-%m-%d %H:%M:%S')
        else:
            return ''

    def get_total_children(self, obj: Timelog):
        return obj.children.filter(end_time__isnull=False).count()

    def get_all_hours(self, obj: Timelog):
        total_hours = 0.0
        total_seconds = 0

        # Calculate parent hours
        if obj.end_time and obj.start_time:
            total_seconds = (obj.end_time - obj.start_time).total_seconds()
            total_hours += round(
                (obj.end_time - obj.start_time).total_seconds() / 3600, 2)

        # Calculate children hours
        for child in obj.children.filter(end_time__isnull=False):
            if child.end_time and child.start_time:
                total_hours += round(
                    (child.end_time - child.start_time).total_seconds() / 3600, 2)

        hours = round(total_hours, 2)
        if total_seconds > 0 and hours == 0:
            hours = 0.01

        return hours

    def get_hours(self, obj):
        if not obj.end_time:
            return 0
        total_seconds = (obj.end_time - obj.start_time).total_seconds()

        hours = round(total_seconds / 3600, 2)

        if total_seconds > 0 and hours == 0:
            hours = 0.01

        return hours

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
            'employee',
            'employee_name',
            'running',
            'submitted',
            'project_active',
            'timezone',
            'parent',
            'total_children',
            'all_from_time',
            'all_to_time',
            'all_hours'
        ]


class TimelogSerializerERP(TimelogSerializer):

    description = serializers.SerializerMethodField()

    def get_description(self, obj: Timelog):
        if not obj.description:
            return '-'
        h = html2text.HTML2Text()
        h.ignore_links = True
        return h.handle(obj.description)
