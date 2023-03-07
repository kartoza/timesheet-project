from django.urls import path
from dashboard.api_views import (
    BurnDownChartData,
    ListSummary,
    PublicBurnDownChartData
)
from dashboard.views import (
    DashboardView, SpaceView,
    SummaryView, PublicSummaryView, PlannerView
)
from django.conf import settings
from django.conf.urls.static import static



urlpatterns = [
    path('', DashboardView.as_view(), name='dashboard'),
    path('space', SpaceView.as_view(), name='space'),
    path('summary', SummaryView.as_view(), name='summary'),
    path('planner', PlannerView.as_view(), name='planner'),
    path('summary/<slug:title>/', 
        PublicSummaryView.as_view(), 
        name='public-summary'),
    path('api/burndown-chart-data/',
         BurnDownChartData.as_view(),
         name='burndown-chart-data'),
    path('api/list-summary/',
         ListSummary.as_view(),
         name='list-summary'),
    path('api/public-burndown-chart-data/',
         PublicBurnDownChartData.as_view(),
         name='public-burndown-chart-data')
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    