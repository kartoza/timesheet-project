from enum import Enum


class DocType(Enum):
    ACTIVITY = 'Activity Type'
    TASK = 'Task'
    PROJECT = 'Project'
    EMPLOYEE = 'Employee'
    USER = 'User'
    TIMESHEET_DETAIL = 'Timesheet Detail'
    LEAVE = 'Leave Application'
    HOLIDAY_LIST = 'Holiday List'
    HOLIDAY = 'Holiday'

