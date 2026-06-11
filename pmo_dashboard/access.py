def can_access_pmo(user) -> bool:
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    from preferences import preferences
    allowed_ids = set(
        preferences.TimesheetPreferences.pmo_allowed_groups.values_list('id', flat=True)
    )
    user_group_ids = set(user.groups.values_list('id', flat=True))
    return bool(allowed_ids & user_group_ids)
