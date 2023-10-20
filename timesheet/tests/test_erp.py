import datetime
from django.test import TestCase
from unittest.mock import patch, PropertyMock
from django.conf import settings
from timesheet.models import Timelog
from timesheet.serializers.timesheet import TimelogSerializerERP
from timesheet.tests.model_factories import (
    TimelogFactory,
    UserFactory
)
from timesheet.utils.erp import push_timesheet_to_erp

# Mocking the settings.ERPNEXT_SITE_LOCATION
mocked_erp_site = PropertyMock(return_value="https://erp_example.com")
type(settings).ERPNEXT_SITE_LOCATION = mocked_erp_site


class TestErpHelper(TestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.timelog1 = TimelogFactory.create(
            user=self.user
        )

    def test_timelog_serializer_erp(self):
        timelog = TimelogFactory.create(
            user=self.user,
            timezone='Asia/Jakarta',
            start_time=datetime.datetime(2023, 10, 20, 20, 58)
        )
        timelog_data = TimelogSerializerERP(
            timelog
        )
        self.assertEqual(
            timelog_data.data['from_time'],
            '2023-10-20 13:58:00'
        )

    @patch('requests.post')
    def test_push_timesheet_to_erp_successful_submission(self, mock_post):
        # Mock a successful response from ERPNEXT
        mock_response = mock_post.return_value
        mock_response.status_code = 200

        # Call your function
        push_timesheet_to_erp(Timelog.objects.all(), self.user)

        mock_post.assert_called()

        # 2. Check time logs are marked as submitted
        self.timelog1.refresh_from_db()
        self.assertTrue(self.timelog1.submitted)

    @patch('requests.post')
    def test_push_timesheet_to_erp_unsuccessful_submission(self, mock_post):
        mock_response = mock_post.return_value
        mock_response.status_code = 400

        push_timesheet_to_erp(Timelog.objects.all(), self.user)

        mock_post.assert_called()

        self.timelog1.refresh_from_db()
        self.assertFalse(self.timelog1.submitted)
