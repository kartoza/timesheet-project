import os

from .core import *  # noqa

DEBUG = False

STATIC_URL = '/static/'
MEDIA_URL = '/media/'

MEDIA_ROOT = '/home/web/media'
STATIC_ROOT = '/home/web/static'
ALLOWED_HOSTS = ['timesheets.kartoza.com']

STATICFILES_STORAGE = 'core.storage.BigBlindManifestStaticFilesStorage'
