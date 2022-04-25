from django.test import TestCase

from timesheet.tests.model_factories import *


# Create your tests here.
class TestTimesheetModel(TestCase):
    def setUp(self) -> None:
        pass

    def test_Timesheet_create(self):

        model = TimesheetFactory.create()

        self.assertTrue(
            str(model),
            f'{model.user} - {model.task}'
        )
