from enum import Enum


class DocType(Enum):
    ACTIVITY = 'Activity Type'
    TASK = 'Task'
    PROJECT = 'Project'
    EMPLOYEE = 'Employee'
    USER = 'User'
    TIMESHEET = 'Timesheet'
    TIMESHEET_DETAIL = 'Timesheet Detail'
    LEAVE = 'Leave Application'
    HOLIDAY_LIST = 'Holiday List'
    HOLIDAY = 'Holiday'
    ROLE = 'Role'
    BUSINESS_UNIT = 'Business Unit'
    DEPARTMENT = 'Department'
    ISSUE = 'Issue'
    SALES_ORDER = 'Sales Order'
    SALES_ORDER_ITEM = 'Sales Order Item'
    COMPANY = 'Company'

