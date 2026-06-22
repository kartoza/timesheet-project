from django.shortcuts import render


class MaintenanceMiddleware:
    """Show a maintenance page to non-superusers when TimesheetPreferences.is_updating is True."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if self._is_maintenance_active(request):
            return render(request, 'maintenance.html', status=503)
        return self.get_response(request)

    @staticmethod
    def _is_maintenance_active(request):
        if request.user.is_authenticated and request.user.is_superuser:
            return False
        try:
            from preferences import preferences
            return preferences.TimesheetPreferences.is_updating
        except Exception:
            return False
