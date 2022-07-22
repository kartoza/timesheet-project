from django.urls import path, include
from rest_framework import routers
from timesheet.api_views.timesheet import TimesheetModelViewSet, TimesheetViewSet
from timesheet.api_views.activity_list import ActivityList
from timesheet.api_views.project import ProjectAutocomplete
from timesheet.api_views.task import TaskAutocomplete
from timesheet.api_views.timesheet import TimeLogDeleteAPIView

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
    path('task-list/<int:task_id>/',
         TaskAutocomplete.as_view(),
         name='task-list')
]
