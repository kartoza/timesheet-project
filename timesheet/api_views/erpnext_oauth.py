import logging
import secrets
from datetime import timedelta
from urllib.parse import urlencode

import requests
from django.conf import settings
from django.contrib.auth import get_user_model, login
from django.shortcuts import redirect
from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

User = get_user_model()

logger = logging.getLogger(__name__)


class ERPNextOAuthInitiateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not settings.ERPNEXT_OAUTH_CLIENT_ID:
            return Response(
                {'error': 'ERPNext OAuth is not configured'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        state = secrets.token_urlsafe(32)
        request.session['erpnext_oauth_state'] = state

        params = {
            'client_id': settings.ERPNEXT_OAUTH_CLIENT_ID,
            'response_type': 'code',
            'redirect_uri': settings.ERPNEXT_OAUTH_REDIRECT_URI,
            'scope': 'all openid',
            'state': state,
        }
        authorize_url = (
            f'{settings.ERPNEXT_SITE_LOCATION}'
            f'/api/method/frappe.integrations.oauth2.authorize?'
            f'{urlencode(params)}'
        )
        return Response({'authorization_url': authorize_url})


class ERPNextOAuthCallbackView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        code = request.query_params.get('code')
        state = request.query_params.get('state')

        if not code:
            return Response(
                {'error': 'Missing authorization code'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        saved_state = request.session.pop('erpnext_oauth_state', None)
        if not saved_state or saved_state != state:
            return Response(
                {'error': 'Invalid state parameter'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_url = (
            f'{settings.ERPNEXT_SITE_LOCATION}'
            f'/api/method/frappe.integrations.oauth2.get_token'
        )
        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': settings.ERPNEXT_OAUTH_REDIRECT_URI,
            'client_id': settings.ERPNEXT_OAUTH_CLIENT_ID,
            'client_secret': settings.ERPNEXT_OAUTH_CLIENT_SECRET,
        }

        try:
            response = requests.post(token_url, data=data)
        except requests.RequestException:
            logger.exception('Failed to exchange OAuth code')
            return Response(
                {'error': 'Failed to connect to ERPNext'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if response.status_code != 200:
            logger.error('OAuth token exchange failed: %s', response.text)
            return Response(
                {'error': 'Failed to exchange authorization code'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_data = response.json()
        profile = request.user.profile
        profile.erpnext_oauth_access_token = token_data['access_token']
        profile.erpnext_oauth_refresh_token = token_data.get('refresh_token', '')
        expires_in = token_data.get('expires_in', 3600)
        profile.erpnext_oauth_token_expires_at = (
            timezone.now() + timedelta(seconds=expires_in)
        )
        profile.save()

        return Response({'status': 'connected'})


class ERPNextOAuthStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = request.user.profile
        connected = profile.erpnext_oauth_token is not None
        data = {'connected': connected}
        if connected and profile.erpnext_oauth_token_expires_at:
            data['expires_at'] = profile.erpnext_oauth_token_expires_at.isoformat()
        return Response(data)


class ERPNextOAuthDisconnectView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile = request.user.profile

        if profile.erpnext_oauth_access_token:
            revoke_url = (
                f'{settings.ERPNEXT_SITE_LOCATION}'
                f'/api/method/frappe.integrations.oauth2.revoke_token'
            )
            try:
                requests.post(revoke_url, data={
                    'token': profile.erpnext_oauth_access_token,
                })
            except requests.RequestException:
                logger.warning('Failed to revoke token on ERPNext')

        profile.erpnext_oauth_access_token = None
        profile.erpnext_oauth_refresh_token = None
        profile.erpnext_oauth_token_expires_at = None
        profile.save()

        return Response({'status': 'disconnected'})


class ERPNextOAuthLoginInitiateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not settings.ERPNEXT_OAUTH_CLIENT_ID:
            return Response(
                {'error': 'ERPNext OAuth is not configured'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        state = secrets.token_urlsafe(32)
        request.session['erpnext_oauth_login_state'] = state

        params = {
            'client_id': settings.ERPNEXT_OAUTH_CLIENT_ID,
            'response_type': 'code',
            'redirect_uri': settings.ERPNEXT_OAUTH_LOGIN_REDIRECT_URI,
            'scope': 'all openid',
            'state': state,
        }
        authorize_url = (
            f'{settings.ERPNEXT_SITE_LOCATION}'
            f'/api/method/frappe.integrations.oauth2.authorize?'
            f'{urlencode(params)}'
        )
        return redirect(authorize_url)


class ERPNextOAuthLoginCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get('code')
        state = request.query_params.get('state')

        if not code:
            return Response(
                {'error': 'Missing authorization code'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        saved_state = request.session.pop('erpnext_oauth_login_state', None)
        if not saved_state or saved_state != state:
            return Response(
                {'error': 'Invalid state parameter'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Exchange code for tokens
        token_url = (
            f'{settings.ERPNEXT_SITE_LOCATION}'
            f'/api/method/frappe.integrations.oauth2.get_token'
        )
        data = {
            'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': settings.ERPNEXT_OAUTH_LOGIN_REDIRECT_URI,
            'client_id': settings.ERPNEXT_OAUTH_CLIENT_ID,
            'client_secret': settings.ERPNEXT_OAUTH_CLIENT_SECRET,
        }

        logger.info(
            'Login token exchange redirect_uri=%s',
            settings.ERPNEXT_OAUTH_LOGIN_REDIRECT_URI,
        )

        try:
            response = requests.post(token_url, data=data)
        except requests.RequestException:
            logger.exception('Failed to exchange OAuth code for login')
            return Response(
                {'error': 'Failed to connect to ERPNext'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if response.status_code != 200:
            logger.error(
                'OAuth login token exchange failed (status=%s): %s',
                response.status_code, response.text,
            )
            return Response(
                {
                    'error': 'Failed to exchange authorization code',
                    'detail': response.text,
                    'status_code': response.status_code,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_data = response.json()
        access_token = token_data['access_token']

        # Fetch user profile from ERPNext OpenID endpoint
        profile_url = (
            f'{settings.ERPNEXT_SITE_LOCATION}'
            f'/api/method/frappe.integrations.oauth2.openid_profile'
        )
        try:
            profile_response = requests.get(
                profile_url,
                headers={'Authorization': f'Bearer {access_token}'},
            )
        except requests.RequestException:
            logger.exception('Failed to fetch ERPNext user profile')
            return Response(
                {'error': 'Failed to fetch user profile from ERPNext'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if profile_response.status_code != 200:
            logger.error('OpenID profile fetch failed: %s', profile_response.text)
            return Response(
                {'error': 'Failed to fetch user profile'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        profile_data = profile_response.json()
        email = profile_data.get('email')
        if not email:
            return Response(
                {'error': 'No email found in ERPNext profile'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Find or create Django user
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            user = User.objects.create_user(
                username=email,
                email=email,
                first_name=profile_data.get('given_name', ''),
                last_name=profile_data.get('family_name', ''),
            )

        # Store OAuth tokens on profile
        profile = user.profile
        profile.erpnext_oauth_access_token = access_token
        profile.erpnext_oauth_refresh_token = token_data.get('refresh_token', '')
        expires_in = token_data.get('expires_in', 3600)
        profile.erpnext_oauth_token_expires_at = (
            timezone.now() + timedelta(seconds=expires_in)
        )
        profile.save()

        # Fetch employee data from ERPNext
        self._pull_employee_data(user, access_token)

        # Create DRF token
        Token.objects.get_or_create(user=user)

        # Log user into Django session
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')

        return redirect('/')

    @staticmethod
    def _pull_employee_data(user, access_token):
        """Fetch employee name and ID from ERPNext using OAuth token."""
        from timesheet.enums.doctype import DocType

        url = (
            f'{settings.ERPNEXT_SITE_LOCATION}/api/'
            f'resource/{DocType.EMPLOYEE.value}'
            f'?limit_page_length=None&fields=["*"]'
            f'&filters=[["company_email","=","{user.email}"]]'
        )
        headers = {'Authorization': f'Bearer {access_token}'}
        try:
            resp = requests.get(url, headers=headers)
        except requests.RequestException:
            logger.exception('Failed to fetch employee data')
            return

        if resp.status_code != 200:
            logger.error('Employee data fetch failed: %s', resp.text)
            return

        data = resp.json().get('data', [])
        if not data:
            return

        employee = data[0]
        profile = user.profile
        profile.employee_name = employee.get('employee_name', '')
        profile.employee_id = employee.get('employee', employee.get('name', ''))
        profile.save()

        user.first_name = employee.get('first_name', user.first_name)
        user.last_name = employee.get('last_name', user.last_name)
        user.save()
