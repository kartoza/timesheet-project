from django.urls import path

from pmo_dashboard.api_views import ProjectListView

urlpatterns = [
    path('api/pmo/projects/', ProjectListView.as_view(), name='pmo-project-list'),
]
