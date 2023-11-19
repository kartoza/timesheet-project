from django.contrib.staticfiles.storage import ManifestStaticFilesStorage
from django.conf import settings


class BigBlindManifestStaticFilesStorage(ManifestStaticFilesStorage):

    def url(self, name, force=True):
        """
        Override .url to use hashed url in development
        """
        return super(ManifestStaticFilesStorage, self).url(name, True)
        