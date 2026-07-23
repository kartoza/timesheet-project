from preferences import preferences

from timesheet.models.profile import ProfileRole


def can_access_pmo(user) -> bool:
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    try:
        if user.profile.role == ProfileRole.PROJECT_MANAGER:
            return True
    except Exception:
        pass

    allowed_groups = preferences.TimesheetPreferences.pmo_allowed_groups.all()
    return user.groups.filter(pk__in=allowed_groups).exists()
