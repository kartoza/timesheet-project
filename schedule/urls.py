from django.urls import path
from schedule.api_views.user_projects import (
    UserProjectList,
    AddUserProjectSlot, RemoveUserProject
)
from schedule.api_views.schedule import (
    ScheduleList,
    AddSchedule,
    UpdateSchedule,
    DeleteSchedule,
    WeeklyScheduleList
)

urlpatterns = [
    path('api/user-project-slots/',
         UserProjectList.as_view(),
         name='user-project-slots'),
    path('api/schedules/',
         ScheduleList.as_view(),
         name='schedules'),
    path('api/weekly-schedules/',
         WeeklyScheduleList.as_view(),
         name='weekly-schedules'),
    path('api/add-user-project-slot/',
         AddUserProjectSlot.as_view(),
         name='add-user-project-slot'),
    path('api/remove-user-project-slot/',
         RemoveUserProject.as_view(),
         name='remove-user-project-slot'),
    path('api/add-schedule/',
         AddSchedule.as_view(),
         name='add-schedule'),
    path('api/update-schedule/',
         UpdateSchedule.as_view(),
         name='update-schedule'),
    path('api/delete-schedule/',
         DeleteSchedule.as_view(),
         name='delete-schedule'),
]
