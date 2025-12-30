"""
Custom preprocessing hooks for drf-spectacular API documentation.
"""


def filter_timesheet_endpoints(endpoints, **kwargs):
    """
    Filter API endpoints to only show timesheet-related endpoints under /api/.

    This hook filters endpoints to only include those from the timesheet app
    that are under the /api/ URL path.
    """
    filtered = []

    for path, path_regex, method, callback in endpoints:
        # Only include endpoints that start with /api/
        if not path.startswith('/api/'):
            continue

        # Check if the endpoint belongs to the timesheet app
        if hasattr(callback, 'cls'):
            # For class-based views
            module = callback.cls.__module__
        elif hasattr(callback, 'actions'):
            # For viewsets
            module = callback.actions.__class__.__module__ if hasattr(callback.actions, '__class__') else ''
        else:
            module = callback.__module__ if hasattr(callback, '__module__') else ''

        # Include only timesheet app endpoints
        if module.startswith('timesheet.'):
            filtered.append((path, path_regex, method, callback))

    return filtered