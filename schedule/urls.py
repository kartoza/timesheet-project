from django.urls import path
from schedule.api_views.user_projects import (
    UserProjectList,
    AddUserProjectSlot
)
from schedule.api_views.schedule import ScheduleList


urlpatterns = [
    path('api/user-project-slots/',
         UserProjectList.as_view(),
         name='user-project-slots'),
    path('api/schedules/',
         ScheduleList.as_view(),
         name='schedules'),
    path('api/add-user-project-slot/',
         AddUserProjectSlot.as_view(),
         name='add-user-project-slot'),
]
