from django.urls import path, include
from rest_framework import routers
from timesheet.api_views.timesheet import (
    TimesheetModelViewSet,
    TimesheetViewSet,
    TimeLogDeleteAPIView,
    SubmitTimeLogsAPIView,
    ClearSubmittedTimesheetsAPIView
)
from timesheet.api_views.activity_list import ActivityList
from timesheet.api_views.project import (
    ProjectAutocomplete,
    PullProjects
)
from timesheet.api_views.task import TaskAutocomplete
from timesheet.views import ManageView


router = routers.DefaultRouter()
router.register(r'timesheet', TimesheetModelViewSet)
router.register(r'timelog', TimesheetViewSet, basename='timelog')

urlpatterns = [
    path('api/', include(router.urls)),
    path('activity-list/',
         ActivityList.as_view(),
         name='activity-list'),
    path('project-list/',
         ProjectAutocomplete.as_view(),
         name='project-list'),
    path('api/delete-time-log/',
         TimeLogDeleteAPIView.as_view(),
         name='delete-time-log'),
    path('api/submit-timesheet/',
         SubmitTimeLogsAPIView.as_view(),
         name='submit-timesheet'),
    path('api/clear-submitted-timesheets/',
         ClearSubmittedTimesheetsAPIView.as_view(),
         name='clear-submitted-timesheets'),
    path('task-list/<int:task_id>/',
         TaskAutocomplete.as_view(),
         name='task-list'),
    path('manage/',
         ManageView.as_view(),
         name='manage'),
    path('api/pull-projects/',
         PullProjects.as_view(),
         name='pull-projects]')
]
