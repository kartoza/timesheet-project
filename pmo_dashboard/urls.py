from django.urls import path

from pmo_dashboard.api_views import ProjectDetailView, ProjectListView, SettingsView
from pmo_dashboard.views import PMODashboardView

urlpatterns = [
    path('pmo-dashboard/', PMODashboardView.as_view(), name='pmo-dashboard'),
    path('api/pmo/projects/', ProjectListView.as_view(), name='pmo-project-list'),
    path('api/pmo/projects/<int:pk>/', ProjectDetailView.as_view(), name='pmo-project-detail'),
    path('api/pmo/settings/', SettingsView.as_view(), name='pmo-settings'),
]
