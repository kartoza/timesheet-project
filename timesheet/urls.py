from django.urls import path, include
from rest_framework import routers
from timesheet.api_views.timesheet import TimesheetViewSet
from timesheet.api_views.activity_list import ActivityList
from timesheet.api_views.project import ProjectAutocomplete
from timesheet.api_views.task import TaskAutocomplete

router = routers.DefaultRouter()
router.register(r'timesheet', TimesheetViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('activity-list/',
         ActivityList.as_view(),
         name='activity-list'),
    path('project-list/',
         ProjectAutocomplete.as_view(),
         name='project-list'),
    path('task-list/<int:task_id>/',
         TaskAutocomplete.as_view(),
         name='task-list')
]
