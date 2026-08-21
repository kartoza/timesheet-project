import os

from .core import *  # noqa

DEBUG = False

STATIC_URL = '/static/'
MEDIA_URL = '/media/'

MEDIA_ROOT = '/home/web/media'
STATIC_ROOT = '/home/web/static'
ALLOWED_HOSTS = ['timesheets.kartoza.com', 'pmo-dashboard.kartoza.com']

STATICFILES_STORAGE = 'core.storage.BigBlindManifestStaticFilesStorage'

SPECTACULAR_SETTINGS['SERVERS'] = [
    {'url': 'https://timesheets.kartoza.com', 'description': 'Production server'},
    {'url': 'https://pmo-dashboard.kartoza.com', 'description': 'PMO Dashboard server'}
]

# Without this, DEBUG=False disables Django's console error logging and falls back to
# mail_admins - which silently no-ops since ADMINS isn't configured, so 500 tracebacks
# were going nowhere. This routes them to stderr, which gunicorn captures into
# --error-logfile.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'loggers': {
        'django.request': {
            'handlers': ['console'],
            'level': 'ERROR',
            'propagate': False,
        },
    },
}
