ALLOWED_PMO_GROUPS = {'pmo', 'management'}


def can_access_pmo(user) -> bool:
    if not user or not user.is_authenticated:
        return False

    if user.is_superuser:
        return True

    group_names = {
        name.strip().lower()
        for name in user.groups.values_list('name', flat=True)
        if name
    }
    return bool(ALLOWED_PMO_GROUPS & group_names)
