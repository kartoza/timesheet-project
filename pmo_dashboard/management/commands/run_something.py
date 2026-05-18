from timesheet.utils.erp import get_erp_data
from timesheet.enums.doctype import DocType
from django.core.management.base import BaseCommand

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from microblog.models import Post, Tag

User = get_user_model()


class Command(BaseCommand):
    help = ''

    def handle(self, *args, **options):
        
        user = User.objects.first()
        get_erp_data(DocType.PROJECT, user=user)
