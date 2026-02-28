import logging
from datetime import timedelta

import requests
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def refresh_oauth_token(profile):
    """Refresh the OAuth access token using the refresh token."""
    if not profile.erpnext_oauth_refresh_token:
        return False

    token_url = (
        f'{settings.ERPNEXT_SITE_LOCATION}'
        f'/api/method/frappe.integrations.oauth2.get_token'
    )
    data = {
        'grant_type': 'refresh_token',
        'refresh_token': profile.erpnext_oauth_refresh_token,
        'client_id': settings.ERPNEXT_OAUTH_CLIENT_ID,
        'client_secret': settings.ERPNEXT_OAUTH_CLIENT_SECRET,
    }

    try:
        response = requests.post(token_url, data=data)
        if response.status_code != 200:
            logger.error('Failed to refresh OAuth token: %s', response.text)
            return False

        token_data = response.json()
        profile.erpnext_oauth_access_token = token_data['access_token']
        if 'refresh_token' in token_data:
            profile.erpnext_oauth_refresh_token = token_data['refresh_token']
        expires_in = token_data.get('expires_in', 3600)
        profile.erpnext_oauth_token_expires_at = (
            timezone.now() + timedelta(seconds=expires_in)
        )
        profile.save()
        return True
    except Exception:
        logger.exception('Error refreshing OAuth token')
        return False


def get_valid_oauth_token(user):
    """Return a valid OAuth access token for the user, refreshing if needed."""
    profile = user.profile

    if not profile.erpnext_oauth_access_token:
        return None

    if profile.erpnext_oauth_token:
        return profile.erpnext_oauth_token

    if refresh_oauth_token(profile):
        return profile.erpnext_oauth_access_token

    return None
