from django.urls import path, include
from dashboard.views import DashboardView, SpaceView


urlpatterns = [
    path('', DashboardView.as_view(), name='dashboard'),
    path('space', SpaceView.as_view(), name='space'),
]
