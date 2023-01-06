from django.http import HttpResponseRedirect
from django.urls import reverse_lazy
from django.views.generic import TemplateView
from django.contrib.auth.mixins import LoginRequiredMixin


class ManageView(LoginRequiredMixin, TemplateView):
    template_name = 'manage.html'

    def get_context_data(self, **kwargs):
        ctx = super(ManageView, self).get_context_data(**kwargs)
        ctx['email'] = self.request.user.email
        return ctx

    def post(self, request, *args, **kwargs):
        request.user.email = request.POST.get('email', '')
        request.user.save()
        return HttpResponseRedirect(
            reverse_lazy('manage')
        )
