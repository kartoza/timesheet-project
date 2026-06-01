import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from collections import OrderedDict
from urllib.parse import quote
import requests
from django.utils.dateparse import parse_date
from preferences import preferences
import logging
import calendar
from django.conf import settings
from django.db.models import Sum, Q
from django.db import transaction
from django.db.utils import OperationalError

from django.utils import timezone
from django.contrib.auth import get_user_model
from schedule.api_views.schedule import (
    calculate_remaining_task_days, update_previous_schedules,
    update_subsequent_schedules, _naive
)
from schedule.models import Schedule
from timesheet.enums.doctype import DocType
from timesheet.models import Timelog, Project, Task, Activity
from pmo_dashboard.models import BusinessUnit
from timesheet.models.project_member import ProjectMember
from timesheet.models.profile import get_country_code_from_timezone
from timesheet.models.user_project import UserProject
from timesheet.serializers.timesheet import TimelogSerializerERP
from timesheet.utils.erpnext_oauth import get_valid_oauth_token

logger = logging.getLogger(__name__)


def get_auth_headers(user=None, erpnext_token=None):
    """Return auth headers for ERPNext API calls.

    Prefers OAuth Bearer token if available, falls back to API key token.
    """
    if user:
        oauth_token = get_valid_oauth_token(user)
        if oauth_token:
            return {'Authorization': f'Bearer {oauth_token}'}
        else:
            user_token = user.profile.token
            if user_token:
                return {'Authorization': f'token {user_token}'}

    if not erpnext_token:
        erpnext_token = settings.ERPNEXT_TOKEN
    return {'Authorization': f'token {erpnext_token}'}


def retry_operation(func):
    def wrapper(*args, **kwargs):
        attempts = 5
        while attempts > 0:
            try:
                return func(*args, **kwargs)
            except OperationalError as e:
                if 'database is locked' in str(e) and attempts > 1:
                    time.sleep(1)
                    attempts -= 1
                else:
                    raise
    return wrapper


class ProjectsNotFound(Exception):
    "Raised when projects are not found in erpnext"
    pass


def get_erp_data(doctype: DocType, erpnext_token: str = None, filters: str = '', doctype_value: str = '', user=None) -> list:
    path = f'resource/{doctype.value}/{doctype_value}'.rstrip('/')
    url = f'{settings.ERPNEXT_SITE_LOCATION}/api/{path}?limit_page_length=None&fields=["*"]'
    if filters:
        url += '&filters=' + filters
    headers = get_auth_headers(user=user, erpnext_token=erpnext_token)
    response = requests.request(
        'GET',
        url,
        headers=headers
    )
    if not response.status_code == 200:
        logger.error(response.content)
        return []

    response_data = response.json()
    if 'data' not in response_data:
        logger.error('Data not found')
        return []
    return response_data['data']


def get_erp_project_detail(project_name: str, user=None) -> dict:
    url = f'{settings.ERPNEXT_SITE_LOCATION}/api/resource/Project/{quote(project_name)}?fields=["*"]'
    headers = get_auth_headers(user=user)
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        logger.error(f'Failed to fetch project detail for {project_name}: {response.content}')
        return {}
    return response.json().get('data', {})


def generate_api_secret(user: get_user_model()):
    url = (
        f'{settings.ERPNEXT_SITE_LOCATION}/api/'
        f'method/frappe.core.doctype.user.user.generate_keys?user='
    )
    token = preferences.TimesheetPreferences.admin_token
    headers = {
        'Authorization': 'token {}'.format(token)
    }
    response = requests.post(
        url + user.email,
        headers=headers
    )
    if response.status_code == 200:
        response_data = response.json()
        if 'message' in response_data:
            user.profile.api_secret = response_data['message']['api_secret']
            user.profile.save()


@retry_operation
def pull_holiday_list(user):
    with transaction.atomic():
        public_holidays = []

        employee_id = getattr(user.profile, 'employee_id', None)
        if not employee_id:
            pull_user_data_from_erp(user)
            employee_id = getattr(user.profile, 'employee_id', None)
        if not employee_id:
            return

        employee_docs = get_erp_data(
            DocType.EMPLOYEE,
            preferences.TimesheetPreferences.admin_token,
            f'[["name", "=", "{employee_id}"]]',
            user=user
        )
        if not employee_docs:
            employee_docs = get_erp_data(
                DocType.EMPLOYEE,
                preferences.TimesheetPreferences.admin_token,
                f'[["employee", "=", "{employee_id}"]]',
                user=user
            )

        holiday_list_name = None
        if employee_docs:
            emp = employee_docs[0]
            holiday_list_name = emp.get('holiday_list')

        if not holiday_list_name:
            country_code = get_country_code_from_timezone(user.profile.timezone)
            if not country_code:
                return
            holiday_list = get_erp_data(
                DocType.HOLIDAY_LIST,
                preferences.TimesheetPreferences.admin_token,
                f'[["country", "=", "{country_code}"]]',
                user=user
            )
            if len(holiday_list) == 0:
                holiday_list = get_erp_data(
                    DocType.HOLIDAY_LIST,
                    preferences.TimesheetPreferences.admin_token,
                    f'[["custom_country_code", "=", "{country_code}"]]',
                    user=user
                )
            if len(holiday_list) > 0:
                if len(holiday_list) > 1:
                    holiday_data = next(
                        (item for item in holiday_list if user.first_name.lower() in str(item.get('name','')).lower()),
                        None
                    )
                    if holiday_data:
                        holiday_list_name = holiday_data['name']
                    else:
                        holiday_list_name = holiday_list[0]['name']
                else:
                    holiday_list_name = holiday_list[0]['name']
            else:
                return

        current_year = datetime.now().year
        first_day_of_current_year = f"{current_year}-01-01"

        holidays_doc = None
        if holiday_list_name:
            holidays_doc = get_erp_data(
                DocType.HOLIDAY_LIST,
                preferences.TimesheetPreferences.admin_token,
                doctype_value=holiday_list_name,
                user=user
            )

        if isinstance(holidays_doc, dict) and 'holidays' in holidays_doc:
            for holiday in holidays_doc['holidays']:
                if (
                    holiday['description'] not in ['Saturday', 'Sunday'] and
                    parse_date(holiday['holiday_date']) >= parse_date(first_day_of_current_year)
                ):
                    public_holidays.append(holiday)

        if len(public_holidays) == 0:
            return

        activity, _ = Activity.objects.get_or_create(
            name='Public holiday'
        )

        user_public_holidays = Schedule.objects.filter(
            activity__name__icontains='Public holiday',
            user=user
        )
        user_public_holidays.delete()

        for leave in public_holidays:
            Schedule.objects.update_or_create(
                erp_id=leave['description'],
                user=user,
                activity=activity,
                start_time=leave['holiday_date'],
                end_time=leave['holiday_date'],
                defaults={
                    'notes': leave['description']
                }
            )
            leave = Schedule.objects.filter(
                erp_id=leave['description'],
                start_time=leave['holiday_date'],
                end_time=leave['holiday_date'],
                user=user
            )
            if leave.count() > 1:
                leave.exclude(
                    id=leave.last().id
                ).delete()


def generate_api_key(user: get_user_model()):
    users = get_erp_data(
        DocType.USER, preferences.TimesheetPreferences.admin_token,
        f'[["email", "=", "{user.email}"]]'
    )
    api_key_found = False
    if len(users) > 0:
        erp_user = users[0]
        user.profile.api_key = erp_user['api_key']
        user.profile.save()
        api_key_found = True

    generate_api_secret(user)
    if not api_key_found:
        users = get_erp_data(
            DocType.USER, preferences.TimesheetPreferences.admin_token,
            f'[["email", "=", "{user.email}"]]'
        )
        if len(users) > 0:
            erp_user = users[0]
            user.profile.api_key = erp_user['api_key']
            user.profile.save()


def pull_user_data_from_erp(user: get_user_model()):

    # if not user.profile.token:
    #     generate_api_key(user)

    employee = get_erp_data(
        DocType.EMPLOYEE, user.profile.token,
        f'[["company_email", "=", "{user.email}"]]',
        user=user
    )
    if len(employee) > 0:
        employee_data = employee[0]
        user.profile.employee_name = employee_data['employee_name']
        user.profile.employee_id = employee_data['employee']
        user.profile.save()

        user.first_name = employee_data['first_name']
        user.last_name = employee_data['last_name']
        user.save()


def _user_by_email(email: str):
    if not email:
        return None
    email = email.lower()
    user, _ = get_user_model().objects.get_or_create(
        email=email,
        defaults={'username': email}
    )
    return user


@retry_operation
def pull_project_members_from_erp(user: get_user_model()):
    projects = list(Project.objects.all())
    if not projects:
        return

    project_members_map = {}

    # Unfortunately, we cannot fetch all project members at once.
    # Fetch each project individually in parallel to get project_team_members
    def fetch_members(project_name):
        detail = get_erp_project_detail(project_name, user=user)
        return (
            project_name,
            detail.get('project_team_members', []),
            detail.get('project_lead', '')
        )

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_members, p.name): p.name for p in projects}
        for future in as_completed(futures):
            name, members, project_lead_email = future.result()
            project_members_map[name] = {'members': members, 'project_lead': project_lead_email.lower()}

    User = get_user_model()
    with transaction.atomic():
        for project in projects:
            data = project_members_map.get(project.name, {})
            members = data.get('members', [])
            project_lead_email = data.get('project_lead', '')
            ProjectMember.objects.filter(project=project).delete()

            lead_in_team = any(m.get('employee', '').lower() == project_lead_email for m in members)
            if project_lead_email and not lead_in_team:
                members = members + [{'employee': project_lead_email, 'role': '', 'project_lead_entry': True}]

            emails = {
                m.get('employee', '').lower()
                for m in members
                if m.get('employee')
            }
            user_map = {
                u.email.lower(): u
                for u in User.objects.filter(email__in=emails)
            }
            for email in emails:
                if email not in user_map:
                    u, _ = User.objects.get_or_create(
                        email=email,
                        defaults={'username': email}
                    )
                    user_map[email] = u

            seen = set()
            unique_members = []
            for m in members:
                email = m.get('employee', '').lower()
                if email and email not in seen:
                    seen.add(email)
                    unique_members.append(m)

            ProjectMember.objects.bulk_create([
                ProjectMember(
                    project=project,
                    user=user_map.get(m.get('employee', '').lower()),
                    role=m.get('role', ''),
                    project_lead=m.get('employee', '').lower() == project_lead_email,
                )
                for m in unique_members
            ])


def pull_projects_from_erp(user: get_user_model()):
    projects = get_erp_data(DocType.PROJECT, user=user)

    if len(projects) == 0:
        raise ProjectsNotFound

    with transaction.atomic():
        updated = timezone.now()
        updated_projects = []
        for project in projects:
            project_type = project.get('project_type')
            business_unit_name = project.get('custom_business_unit', '')
            business_unit = None
            if business_unit_name:
                business_unit, _ = BusinessUnit.objects.get_or_create(name=business_unit_name)
            
            _project, _ = Project.objects.update_or_create(
                name=project['name'],
                defaults={
                    'is_active': project.get('status', '') == 'Open',
                    'updated': updated,
                    'project_type': project_type.upper() if project_type else '',
                    'business_unit': business_unit,
                    'expected_start_date': project.get('expected_start_date') or None,
                    'expected_end_date': project.get('expected_end_date') or None,
                    'project_lead': _user_by_email(project.get('project_lead', '')),
                    'relations_manager': _user_by_email(project.get('custom_project_relations_manager', '')),
                    'customer': project.get('customer') or '',
                    'rag': project.get('rag') or '',
                    'expected_time': project.get('expected_time'),
                    'actual_time': project.get('actual_time'),
                    'progress_in_hours': project.get('progress_in_hours'),
                    'percent_complete': project.get('percent_complete'),
                    'estimated_costing': project.get('estimated_costing'),
                    'total_sales_amount': project.get('total_sales_amount'),
                    'total_costing_amount': project.get('total_costing_amount'),
                    'total_billable_amount': project.get('total_billable_amount'),
                    'total_billed_amount': project.get('total_billed_amount'),
                    'gross_margin': project.get('gross_margin'),
                    'per_gross_margin': project.get('per_gross_margin'),
                }
            )
            UserProject.objects.get_or_create(
                user=user,
                project=_project
            )
            updated_projects.append(_project.id)

        # Check inactive projects
        inactive = UserProject.objects.exclude(
            project__updated=updated
        )
        # if inactive.exists():
        #     inactive_projects = Project.objects.filter(
        #         id__in=inactive.values('project')
        #     ).distinct()
        #     inactive_projects.update(is_active=False)

        tasks = get_erp_data(
            DocType.TASK, preferences.TimesheetPreferences.admin_token,
            user=user
        )
        updated_tasks = []
        for task in tasks:
            try:
                project = Project.objects.get(name=task['project'])
            except Project.DoesNotExist:
                continue
            try:
                task, _ = Task.objects.update_or_create(
                    project=project,
                    name=task['subject'],
                    erp_id=task['name'],
                    defaults={
                        "expected_time": task['expected_time'],
                        "actual_time": task['actual_time']
                    }
                )
                updated_tasks.append(task.id)
            except Task.MultipleObjectsReturned:
                tasks = Task.objects.filter(
                    project=project,
                    name=task['subject'],
                    erp_id=task['name'],
                ).order_by('-id')
                latest_task = tasks.first()
                tasks.exclude(id=latest_task.id).delete()
                tasks.update(
                    expected_time=task['expected_time'],
                    actual_time=task['actual_time']
                )
                updated_tasks.append(latest_task.id)

        # Check inactive tasks
        inactive_tasks = Task.objects.filter(
            project_id__in=updated_projects
        ).exclude(
            id__in=updated_tasks
        ).distinct()
        print('inactive_tasks : {}'.format(inactive_tasks.count()))

        activities = get_erp_data(
            DocType.ACTIVITY, user=user)

        for activity in activities:
            if 'name' not in activity:
                continue
            Activity.objects.get_or_create(
                name=activity['name']
            )


def push_timesheet_to_erp(queryset: Timelog.objects, user: get_user_model()):
    serializer = TimelogSerializerERP(
        queryset.order_by('start_time'), many=True)

    datetime_format = '%Y-%m-%d %H:%M:%S'
    timelogs = {}
    parent_ids = []

    for serializer_data in serializer.data:
        from_time = datetime.strptime(serializer_data['from_time'], datetime_format)
        to_time = datetime.strptime(serializer_data['to_time'], datetime_format)
        if from_time == to_time:
            try:
                if Timelog.objects.get(id=serializer_data.get('id')).children.count() > 0:
                    parent_ids.append(serializer_data.get('id'))
            except Timelog.DoesNotExist:
                pass
            continue
        project_name = serializer_data['project_name']
        if project_name not in timelogs:
            timelogs[project_name] = {
                'owner': serializer_data['owner_name'],
                'employee_name': serializer_data['employee_name'],
                'employee': serializer_data['employee'],
                'from_time': from_time,
                'to_time': to_time,
                'data': [serializer_data],
                'ids': [serializer_data.get('id')]
            }
        else:
            if from_time < timelogs[project_name]['from_time']:
                timelogs[project_name]['from_time'] = from_time
            if to_time > timelogs[project_name]['to_time']:
                timelogs[project_name]['to_time'] = to_time
            timelogs[serializer_data['project_name']]['data'].append(
                serializer_data
            )
            timelogs[serializer_data['project_name']]['ids'].append(
                serializer_data.get('id')
            )

    url = f'{settings.ERPNEXT_SITE_LOCATION}/api/resource/Timesheet'
    headers = get_auth_headers(user=user)
    logger.error(headers)

    submitted_timelogs = []
    for key, value in timelogs.items():
        erp_timesheet_data = {
            'employee_name': value['employee_name'],
            'employee': value['employee'],
            'title': (
                f'{value["owner"]} : '
                f'{value["from_time"].strftime("%d/%m/%y")}-'
                f'{value["to_time"].strftime("%d/%m/%y")} - {key}'
            ),
            'time_logs': value["data"]
        }
        submitted_timelogs.append(value["data"])

        logger.error(erp_timesheet_data)
        response = requests.post(
            url,
            data=json.dumps(erp_timesheet_data),
            headers=headers
        )
        if response.status_code == 200:
            logger.info('Timesheet submitted successfully')

            Timelog.objects.filter(
                id__in=value['ids']
            ).update(submitted=True)

            if parent_ids:
                Timelog.objects.filter(
                    id__in=parent_ids
                ).update(submitted=True)

        else:
            logger.error(response.text)


def get_report_data(report_name: str, erpnext_token: str = None, filters: str = '', user=None) -> list:
    url = (
        f'{settings.ERPNEXT_SITE_LOCATION}/api/'
        f'method/frappe.desk.query_report.run?report_name={report_name}'
    )
    if filters:
        url += '&filters=' + filters
    headers = get_auth_headers(user=user, erpnext_token=erpnext_token)
    response = requests.request(
        'GET',
        url,
        headers=headers
    )
    if not response.status_code == 200:
        logger.error(response.content)
        return []

    response_data = response.json()
    if 'message' not in response_data:
        logger.error('Data not found')
        return []
    message = response_data['message']
    if 'result' not in message:
        logger.error('Data not found')
        return []
    return message['result']


def get_detailed_report_data(project_name: str, filters: str = '', user = None):
    if not filters:
        filters = f'{{"Project":"{project_name}"}}'
    timesheet_detail = get_report_data(
        'Timesheet%20Detailed%20Report',
        preferences.TimesheetPreferences.admin_token,
        filters,
        user)
    return timesheet_detail

def get_detailed_report_data_by_employee(employee_id: str, start_date: str, end_date: str):
    filters = f'{{"Employee ID":"{employee_id}","start_date":"{start_date}","end_date":"{end_date}"}}'
    timesheet_detail = get_report_data(
        'Timesheet%20Detailed%20Report',
        preferences.TimesheetPreferences.admin_token,
        filters)
    return timesheet_detail

def get_week_of_month(dt):
    """Calculate the week number within the month for a given date."""
    first_day_of_month_weekday, _ = calendar.monthrange(dt.year, dt.month)
    # Adjust start day of the week to match ISO calendar (Monday as the first day)
    adjusted_day = dt.day + first_day_of_month_weekday - 1
    return (adjusted_day // 7) + 1


def get_burndown_chart_data(project_name):
    try:
        project = Project.objects.get(name=project_name)
    except Project.DoesNotExist:
        return {'error': 'Project not found'}

    aggregate_hours = Task.objects.filter(project=project).aggregate(
        total_hours=Sum('expected_time'),
        total_actual_hours=Sum('actual_time')
    )

    timesheet_detail = get_detailed_report_data(project_name)
    hours_by_week = {}

    for timesheet in timesheet_detail:
        if not isinstance(timesheet, dict):
            continue
        date_str = timesheet.get('Date')
        if not date_str:
            continue

        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
        week_key = date_obj.strftime('%Y%W')  # Year and Week number
        week_of_month = get_week_of_month(date_obj)

        if week_key not in hours_by_week:
            hours_by_week[week_key] = {
                'hours': 0,
                'unbillable_hours': 0,
                'week_string': f'{calendar.month_abbr[date_obj.month]} Week {week_of_month}',
            }

        billable_hours = timesheet.get('Billable Hours', 0)
        total_hours = timesheet.get('Hours', 0)
        hours_by_week[week_key]['hours'] += total_hours
        hours_by_week[week_key]['unbillable_hours'] += (total_hours - billable_hours)

    sorted_hours = OrderedDict(sorted(hours_by_week.items()))

    return {
        'hours': sorted_hours,
        'total_hours': aggregate_hours,
        'project': project_name
    }


@retry_operation
def pull_leave_data_from_erp(user):
    """
    Retrieves leave days data from ERPNext and generates a leave schedule.
    """
    from schedule.models.schedule import Schedule
    with transaction.atomic():
        filters = []
        if user.profile.employee_id:
            filters.append(["employee", "=", user.profile.employee_id])
        else:
            filters.append(
                ["employee_name", "=", f"{user.first_name} {user.last_name}"])
        filters.append(["status", "=", "Approved"])
        leave_data = get_erp_data(
            DocType.LEAVE, preferences.TimesheetPreferences.admin_token,
            str(filters).replace('\'', '"'),
            user=user
        )
        from django.db.models import Q

        # Delete all leave first
        user_leave = Schedule.objects.filter(
            Q(activity__name__icontains='leave -') | Q(activity__name__icontains='lieu'),
            user=user
        )
        user_leave.delete()

        leave_type = {
            'Paid Annual leave': 'Leave - Paid',
            'Paid Sick Leave': 'Leave - Sick',
            'Leave in lieu of time worked': 'Time in lieu'
        }
        for leave in leave_data:
            if leave['leave_type'] in leave_type:
                activity, _ = Activity.objects.get_or_create(
                    name=leave_type[leave['leave_type']]
                )
            else:
                if 'unpaid' in leave['leave_type'].lower():
                    activity, _ = Activity.objects.get_or_create(
                        name='Leave - Unpaid'
                    )
                elif 'family' in leave['leave_type'].lower():
                    activity, _ = Activity.objects.get_or_create(
                        name='Leave - Paid Family Responsibility'
                    )
                else:
                    activity, _ = Activity.objects.get_or_create(
                        name=leave['leave_type']
                    )
            Schedule.objects.update_or_create(
                erp_id=leave['name'],
                defaults={
                    'user': user,
                    'activity': activity,
                    'start_time': leave['from_date'],
                    'end_time': leave['to_date'],
                    'notes': leave['description']
                }
            )
            leave = Schedule.objects.filter(
                start_time=leave['from_date'],
                end_time=leave['to_date'],
                user=user
            )
            if leave.count() > 1:
                leave.exclude(
                    id=leave.last().id
                ).delete()


@retry_operation
def update_schedule_countdown(user):
    with transaction.atomic():
        schedules = Schedule.objects.filter(
            user_project__user=user
        ).order_by('-start_time')
        updated_tasks = []
        for schedule in schedules:
            if not schedule.task:
                continue
            if schedule.task.id in updated_tasks:
                continue
            updated_tasks.append(
                schedule.task.id
            )
            start_time = _naive(schedule.start_time)
            end_time = _naive(schedule.end_time)
            last_update = _naive(schedule.task.last_update)

            remaining_task_days = calculate_remaining_task_days(
                schedule.task,
                start_time,
                end_time
            )
            print('updating schedule {user} : {task} - {remaining_days}'.format(
                user=user.username,
                task=schedule.task.name,
                remaining_days=remaining_task_days
            ))
            last_day_number = (
                    remaining_task_days - (schedule.end_time - schedule.start_time).days
            )
            schedule.first_day_number = remaining_task_days
            schedule.last_day_number = last_day_number
            schedule.save()

            updated = update_subsequent_schedules(
                start_time=start_time,
                task_id=schedule.task.id,
                last_day_number=last_day_number,
                excluded_schedule=schedule
            )
            if start_time < last_update:
                excluded_schedules = updated
                excluded_schedules.append(schedule.id)
                updated_previous = update_previous_schedules(
                    start_time,
                    schedule.task.id,
                    remaining_task_days,
                    excluded_schedules=excluded_schedules
                )
                updated += updated_previous
