
from django.core.exceptions import PermissionDenied
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView

from pmo_dashboard.access import can_access_pmo


class PMODashboardView(LoginRequiredMixin, TemplateView):
    template_name = 'pmo_dashboard/dashboard.html'

    def dispatch(self, request, *args, **kwargs):
        if not can_access_pmo(request.user):
            raise PermissionDenied
        return super().dispatch(request, *args, **kwargs)
