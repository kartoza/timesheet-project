from django.views.generic import TemplateView


class PMODashboardView(TemplateView):
    template_name = 'pmo_dashboard/dashboard.html'
