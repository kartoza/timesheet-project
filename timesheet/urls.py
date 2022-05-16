from django.urls import path, include
from rest_framework import routers
from timesheet.api_views.timesheet import TimesheetViewSet
from timesheet.api_views.activity_list import ActivityList

router = routers.DefaultRouter()
router.register(r'timesheet', TimesheetViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
    path('activity-list/', ActivityList.as_view(), name='activity-list')
]
