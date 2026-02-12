import re
import html2text

from rest_framework import serializers
from timesheet.models import Timelog, ProjectLink
from timesheet.utils.time import localize_and_convert_to_erp_timezone


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
        if obj.task and obj.task.project:
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
        if obj.task and obj.task.project:
            return obj.task.project.name
        if obj.project:
            return obj.project.name
        return 'Kartoza'

    def get_project(self, obj: Timelog):
        if obj.task and obj.task.project:
            return obj.task.project.name
        if obj.project:
            return obj.project.name
        return ''

    def get_project_id(self, obj: Timelog):
        if obj.task and obj.task.project:
            return obj.task.project.id
        if obj.project:
            return obj.project.id
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
        earliest = obj.start_time
        for desc in obj.get_all_descendants():
            if desc.start_time and (earliest is None or desc.start_time < earliest):
                earliest = desc.start_time
        if earliest:
            return earliest.strftime('%Y-%m-%d %H:%M:%S')
        return ''

    def get_all_to_time(self, obj: Timelog):
        latest = obj.end_time
        for desc in obj.get_all_descendants():
            if desc.end_time and (latest is None or desc.end_time > latest):
                latest = desc.end_time
        if latest:
            return latest.strftime('%Y-%m-%d %H:%M:%S')
        return ''

    def get_from_time(self, obj: Timelog):
        start_time = obj.start_time
        return start_time.strftime('%Y-%m-%d %H:%M:%S')

    def get_to_time(self, obj: Timelog):
        if obj.end_time:
            end_time = obj.end_time
            return end_time.strftime('%Y-%m-%d %H:%M:%S')
        else:
            return ''

    def get_total_children(self, obj: Timelog):
        return len([
            d for d in obj.get_all_descendants()
            if d.end_time is not None
        ])

    def get_all_hours(self, obj: Timelog):
        total_hours = 0.0
        total_seconds = 0

        if obj.end_time and obj.start_time:
            total_seconds = (obj.end_time - obj.start_time).total_seconds()
            total_hours += total_seconds / 3600

        for desc in obj.get_all_descendants():
            if desc.end_time and desc.start_time:
                desc_seconds = (desc.end_time - desc.start_time).total_seconds()
                desc_hours = desc_seconds / 3600
                if desc_seconds > 0 and desc_hours < 0.01:
                    desc_hours = 0.01
                total_hours += desc_hours

        if total_seconds > 0 and total_hours == 0:
            return 0.01

        return total_hours

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
            'is_paused',
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
    from_time = serializers.SerializerMethodField()
    to_time = serializers.SerializerMethodField()

    def get_from_time(self, obj: Timelog):
        start_time = obj.start_time
        if obj.timezone:
            start_time = localize_and_convert_to_erp_timezone(
                obj.start_time,
                obj.timezone
            )
        return start_time.strftime('%Y-%m-%d %H:%M:%S')

    def get_to_time(self, obj: Timelog):
        if obj.end_time:
            end_time = obj.end_time
            if obj.timezone:
                end_time = localize_and_convert_to_erp_timezone(
                    obj.end_time,
                    obj.timezone
                )
            return end_time.strftime('%Y-%m-%d %H:%M:%S')
        else:
            return ''

    def get_description(self, obj: Timelog):
        if not obj.description:
            return '-'
        h = html2text.HTML2Text()
        h.ignore_links = False
        return h.handle(obj.description)


class ProjectLinkSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProjectLink
        fields = '__all__'
