
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView


class PMODashboardView(LoginRequiredMixin, TemplateView):
    template_name = 'pmo_dashboard/dashboard.html'
