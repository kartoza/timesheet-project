from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from microblog.models import Post, Tag

User = get_user_model()

POSTS = [
    {
        'content': '📌 Welcome to our company microblog! This is the place to share updates, tips, and celebrate wins together.',
        'type': Post.TYPE_ANNOUNCEMENT,
        'is_pinned': True,
        'tags': ['welcome', 'company'],
    },
    {
        'content': '📌 Reminder: All timesheets must be submitted by the last working day of each month. Late submissions affect payroll processing.',
        'type': Post.TYPE_WARNING,
        'is_pinned': True,
        'tags': ['timesheets', 'payroll', 'reminder'],
    },
    {
        'content': '📌 Our new office guidelines are now in effect. Please review the updated remote work policy on the intranet.',
        'type': Post.TYPE_ANNOUNCEMENT,
        'is_pinned': True,
        'tags': ['policy', 'remote-work'],
    },
    {
        'content': 'Did you know you can pause and resume timelogs without losing tracked time? Try it next time you step away from your desk.',
        'type': Post.TYPE_TIPS,
        'tags': ['tips', 'timelogs'],
    },
    {
        'content': 'Huge congratulations to the backend team for shipping the ERPNext OAuth integration! Great work everyone! 🎉',
        'type': Post.TYPE_CELEBRATION,
        'tags': ['team', 'milestone'],
    },
    {
        'content': 'Has anyone found a good workflow for handling overlapping project deadlines? Would love to hear how you manage it.',
        'type': Post.TYPE_QUESTION,
        'tags': ['productivity', 'workflow'],
    },
    {
        'content': 'Quick tip: Use tags on your microblog posts to make them easier to filter and find later.',
        'type': Post.TYPE_TIPS,
        'tags': ['tips', 'microblog'],
    },
    {
        'content': 'Warning: The staging server will be down for maintenance this Saturday from 10:00–14:00 SAST. Plan accordingly.',
        'type': Post.TYPE_WARNING,
        'tags': ['maintenance', 'staging', 'devops'],
    },
    {
        'content': 'Q4 planning sessions kick off next week. Please come prepared with your project estimates and blockers.',
        'type': Post.TYPE_ANNOUNCEMENT,
        'tags': ['planning', 'q4'],
    },
    {
        'content': 'Shoutout to Dimas for getting the microblog feature shipped ahead of schedule. The team appreciates it! 🚀',
        'type': Post.TYPE_CELEBRATION,
        'tags': ['shoutout', 'team'],
    },
    {
        'content': 'Pro tip: Keep your timelog descriptions concise but specific. "Implemented auth middleware" beats "worked on backend".',
        'type': Post.TYPE_TIPS,
        'tags': ['tips', 'timesheets'],
    },
    {
        'content': 'What tools are people using for async communication across time zones? We\'re evaluating options and would love input.',
        'type': Post.TYPE_QUESTION,
        'tags': ['async', 'remote-work', 'tools'],
    },
    {
        'content': 'Just a reminder that billable hours must be logged against the correct project code. Internal meetings go under "Internal".',
        'type': Post.TYPE_WARNING,
        'tags': ['timesheets', 'billing'],
    },
    {
        'content': 'We just crossed 500 active users on the platform. Thanks to everyone who helped make this possible!',
        'type': Post.TYPE_CELEBRATION,
        'tags': ['milestone', 'company'],
    },
    {
        'content': 'New API documentation is now live. If you\'re building integrations, check the updated endpoint reference first.',
        'type': Post.TYPE_ANNOUNCEMENT,
        'tags': ['api', 'docs'],
    },
    {
        'content': 'Tip: You can use the period_start and period_end fields to schedule posts in advance — great for planned announcements.',
        'type': Post.TYPE_TIPS,
        'tags': ['tips', 'microblog'],
    },
    {
        'content': 'Is anyone else interested in a weekly virtual coffee catch-up? Drop a reaction if you\'d join.',
        'type': Post.TYPE_QUESTION,
        'tags': ['team', 'culture'],
    },
    {
        'content': 'The CI pipeline was flaky this morning due to a timeout on the test database spin-up. It\'s been fixed — deploys should be smooth again.',
        'type': Post.TYPE_DEFAULT,
        'tags': ['devops', 'ci'],
    },
    {
        'content': 'Reminder: public holidays next month may affect sprint timelines. Check the shared calendar and flag conflicts to your PM.',
        'type': Post.TYPE_WARNING,
        'tags': ['planning', 'reminder'],
    },
    {
        'content': 'First week using the new microblog — loving how easy it is to share quick updates without clogging up email. Great addition!',
        'type': Post.TYPE_DEFAULT,
        'tags': ['microblog', 'feedback'],
    },
]


class Command(BaseCommand):
    help = 'Seed the microblog with 20 sample posts'

    def handle(self, *args, **options):
        author = User.objects.filter(is_superuser=True).first()
        if not author:
            author = User.objects.first()
        if not author:
            self.stderr.write('No users found. Create a user first.')
            return

        pinned_until = timezone.now() + timezone.timedelta(days=30)
        created = 0

        for data in POSTS:
            tag_names = data.pop('tags', [])
            is_pinned = data.get('is_pinned', False)

            post = Post.objects.create(
                author=author,
                pin_valid_until=pinned_until if is_pinned else None,
                **data,
            )

            tags = []
            for name in tag_names:
                tag, _ = Tag.objects.get_or_create(name=name)
                tags.append(tag)
            post.tags.set(tags)

            created += 1
            pin_label = ' [pinned]' if is_pinned else ''
            self.stdout.write(f'  [{post.type}]{pin_label} {str(post)[:60]}')

        self.stdout.write(self.style.SUCCESS(f'\nCreated {created} microblog posts.'))
