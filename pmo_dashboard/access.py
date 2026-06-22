from timesheet.models.profile import ProfileRole


def can_access_pmo(user) -> bool:
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    try:
        return user.profile.role == ProfileRole.PROJECT_MANAGER
    except Exception:
        return False
