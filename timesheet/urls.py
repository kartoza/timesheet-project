from django.urls import path, include
from rest_framework import routers

from timesheet.api_views.quotes import RandomQuotes
from timesheet.api_views.timesheet import (
    TimesheetModelViewSet,
    TimesheetViewSet,
    TimeLogDeleteAPIView,
    SubmitTimeLogsAPIView,
    ClearSubmittedTimesheetsAPIView, BreakTimesheet
)
from timesheet.api_views.activity_list import ActivityList
from timesheet.api_views.project import (
    ProjectAutocomplete,
    PullProjects, ProjectLinkApiView, ProjectLinkListApiView, UserAutocomplete
)
from timesheet.api_views.task import TaskAutocomplete
from timesheet.api_views.user import (
    UserActivities,
    UserLeaderBoard
)
from timesheet.views import ManageView


router = routers.DefaultRouter()
router.register(r'timesheet', TimesheetModelViewSet)
router.register(r'timelog', TimesheetViewSet, basename='timelog_view')


urlpatterns = [
    path('api/', include(router.urls)),
    path('api/activity-list/',
         ActivityList.as_view(),
         name='activity-list'),
    path('api/project-list/',
         ProjectAutocomplete.as_view(),
         name='project-list'),
    path('user-autocomplete/',
         UserAutocomplete.as_view(),
         name='user-autocomplete'),
    path('project-links/',
         ProjectLinkListApiView.as_view(),
         name='project-links'),
    path('project-link/',
         ProjectLinkApiView.as_view(),
         name='project-link'),
    path('api/delete-time-log/',
         TimeLogDeleteAPIView.as_view(),
         name='delete-time-log'),
    path('api/break-timesheet/<int:timelog_id>/',
         BreakTimesheet.as_view(),
         name='break-timesheet'),
    path('api/submit-timesheet/',
         SubmitTimeLogsAPIView.as_view(),
         name='submit-timesheet'),
    path('api/clear-submitted-timesheets/',
         ClearSubmittedTimesheetsAPIView.as_view(),
         name='clear-submitted-timesheets'),
    path('api/task-list/<int:project_id>/',
         TaskAutocomplete.as_view(),
         name='task-list'),
    path('manage/',
         ManageView.as_view(),
         name='manage'),
    path('api/pull-projects/',
         PullProjects.as_view(),
         name='pull-projects'),
    path('api/user-activities/',
         UserActivities.as_view(),
         name='user-activities'),
    path('api/user-leaderboard/',
         UserLeaderBoard.as_view(),
         name='user-leaderboard'),
    path('api/quotes/',
         RandomQuotes.as_view(),
         name='random-quotes'),
]
