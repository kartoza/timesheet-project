from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import Http404
from django.views.generic import TemplateView
from timesheet.models.clock import Clock
from timesheet.models.project import Project
from timesheet.models.summary import SavedSummary


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
    
    def get_context_data(self, **kwargs):
        ctx = super(SpaceView, self).get_context_data(**kwargs)
        ctx['clocks'] = [{'flag': c.flag, 'timezone': c.timezone} for c in Clock.objects.all().order_by('order')]

        return ctx


class SummaryView(LoginRequiredMixin, TemplateView):
    template_name = 'summary.html'
    

class PublicSummaryView(TemplateView):
    template_name = 'public_summary.html'
    
    def get(self, request, *args, **kwargs):
        project_slug_name = self.kwargs.get('title', '')
        try:
            summary = SavedSummary.objects.get(
                slug_name=project_slug_name
            )
            summary.view_count += 1
            summary.save()
        except SavedSummary.DoesNotExist:
            raise Http404()
        return super(PublicSummaryView, self).get(
            request, *args, **kwargs
        )
    
    def get_context_data(self, **kwargs):
        ctx = super(
            PublicSummaryView, self
        ).get_context_data(**kwargs)
        project_slug_name = self.kwargs.get('title', '')
        summary = SavedSummary.objects.get(
            slug_name=project_slug_name
        )
        ctx['selectedProjectId'] = summary.project.id
        ctx['summaryName'] = summary.name
        return ctx
