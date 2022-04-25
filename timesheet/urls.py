from django.urls import path, include
from rest_framework import routers
from timesheet.api_views.timesheet import TimesheetViewSet

router = routers.DefaultRouter()
router.register(r'timesheet', TimesheetViewSet)

urlpatterns = [
    path('api/', include(router.urls))
]
