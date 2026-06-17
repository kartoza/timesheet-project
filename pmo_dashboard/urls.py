from django.urls import path

from pmo_dashboard.api_views import ProjectDetailSyncView, ProjectDetailView, ProjectListView, ProjectSyncView
from pmo_dashboard.views import PMODashboardView

urlpatterns = [
    path('pmo-dashboard/', PMODashboardView.as_view(), name='pmo-dashboard'),
    path('api/pmo/projects/', ProjectListView.as_view(), name='pmo-project-list'),
    path('api/pmo/projects/sync/', ProjectSyncView.as_view(), name='pmo-project-sync'),
    path('api/pmo/projects/<int:pk>/', ProjectDetailView.as_view(), name='pmo-project-detail'),
    path('api/pmo/projects/<int:pk>/sync/', ProjectDetailSyncView.as_view(), name='pmo-project-detail-sync'),
]
