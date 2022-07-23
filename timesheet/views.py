from django.http import HttpResponseRedirect
from django.urls import reverse_lazy
from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin


class ManageView(LoginRequiredMixin, TemplateView):
    template_name = 'manage.html'

    def get_context_data(self, **kwargs):
        ctx = super(ManageView, self).get_context_data(**kwargs)
        ctx['api_key'] = self.request.user.profile.api_key
        return ctx

    def post(self, request, *args, **kwargs):
        profile = request.user.profile
        profile.api_key = request.POST.get('api_key', '')
        api_secret = request.POST.get('api_secret', '')
        if api_secret:
            profile.api_secret = api_secret
        profile.save()
        return HttpResponseRedirect(
            reverse_lazy('manage')
        )
