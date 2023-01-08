import os

from .core import *  # noqa

DEBUG = False

STATIC_URL = '/static/'
MEDIA_URL = '/media/'

MEDIA_ROOT = os.path.join(BASE_DIR, 'media')
STATIC_ROOT = os.path.join(BASE_DIR, 'static')

STATICFILES_STORAGE = 'onairdjango.storage.BigBlindManifestStaticFilesStorage'
