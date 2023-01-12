from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import TemplateView


# Create your views here.
class DashboardView(LoginRequiredMixin, TemplateView):
    template_name = 'dashboard.html'

    def get_context_data(self, **kwargs):
        ctx = super(DashboardView, self).get_context_data(**kwargs)

        ctx['has_keys'] = (
                self.request.user.profile.api_key is not None and
                self.request.user.profile.api_secret is not None
        )

        return ctx


class SpaceView(LoginRequiredMixin, TemplateView):
    template_name = 'space.html'
    