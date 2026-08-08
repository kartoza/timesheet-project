from django.test import TestCase

from timesheet.tests.model_factories import *
from timesheet.utils.timelogs import format_erp_description


# Create your tests here.
class TestTimelogModel(TestCase):
    def setUp(self) -> None:
        pass

    def test_Timesheet_create(self):

        model = TimelogFactory.create()

        self.assertTrue(
            str(model),
            f'{model.user} - {model.task}'
        )


class TestFormatErpDescription(TestCase):
    """Tests converting ERPNext markdown descriptions into stored HTML."""

    def test_bullets_with_links_become_a_list(self):
        source = (
            '* [3] [Display COL identifier in taxonomy admin and detail UI #5488]'
            '(https://github.com/kartoza/bims/issues/5488) '
            '* [5] [Update GBIF API calls to use COL-based species lookup endpoints #5489]'
            '(https://github.com/kartoza/bims/issues/5489)'
        )

        self.assertEqual(
            format_erp_description(source),
            '<ul>'
            '<li>[3] <a href="https://github.com/kartoza/bims/issues/5488" '
            'rel="noopener noreferrer" target="_blank">'
            'Display COL identifier in taxonomy admin and detail UI #5488</a></li>'
            '<li>[5] <a href="https://github.com/kartoza/bims/issues/5489" '
            'rel="noopener noreferrer" target="_blank">'
            'Update GBIF API calls to use COL-based species lookup endpoints #5489</a></li>'
            '</ul>'
        )

    def test_bullets_separated_by_newlines(self):
        self.assertEqual(
            format_erp_description('* First item\n* Second item'),
            '<ul><li>First item</li><li>Second item</li></ul>'
        )

    def test_plain_text_becomes_paragraphs(self):
        self.assertEqual(
            format_erp_description('Reviewed the plan\nWrote it up'),
            '<p>Reviewed the plan</p><p>Wrote it up</p>'
        )

    def test_bare_tag_is_kept_as_text(self):
        self.assertEqual(
            format_erp_description('* [3] no link here'),
            '<ul><li>[3] no link here</li></ul>'
        )

    def test_bold_markers_are_not_treated_as_bullets(self):
        self.assertEqual(
            format_erp_description('Fixed **the** bug'),
            '<p>Fixed **the** bug</p>'
        )

    def test_html_in_the_source_is_escaped(self):
        self.assertEqual(
            format_erp_description('a < b & <script>alert(1)</script>'),
            '<p>a &lt; b &amp; &lt;script&gt;alert(1)&lt;/script&gt;</p>'
        )

    def test_empty_description(self):
        self.assertEqual(format_erp_description(''), '')
        self.assertEqual(format_erp_description('   '), '')
        self.assertEqual(format_erp_description(None), '')
