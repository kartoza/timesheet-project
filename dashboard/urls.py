from django.urls import path
from dashboard.views import DashboardView, SpaceView
from django.conf import settings
from django.conf.urls.static import static



urlpatterns = [
    path('', DashboardView.as_view(), name='dashboard'),
    path('space', SpaceView.as_view(), name='space'),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    