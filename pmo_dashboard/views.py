
from django.core.exceptions import PermissionDenied
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView

from pmo_dashboard.access import can_access_pmo


class PMODashboardView(LoginRequiredMixin, TemplateView):
    template_name = 'pmo_dashboard/dashboard.html'

    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            return self.handle_no_permission()
        if not can_access_pmo(request.user):
            raise PermissionDenied
        return super().dispatch(request, *args, **kwargs)

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['can_access_pmo'] = can_access_pmo(self.request.user)
        return ctx
