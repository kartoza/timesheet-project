"""Management command: fetch RSS feeds and publish microblog posts.

Usage (run manually or via cron):
    python manage.py fetch_rss_posts

Each active ScheduledPostConfig is processed:
 - Fetches the RSS feed at rss_url.
 - Publishes up to posts_per_day new items that haven't been seen before
   (tracked via last_item_guid so the same entry is never published twice).
 - Sets period_end = now + display_duration_hours on each created post.
 - Updates last_fetched_at and last_item_guid on the config.

Suggested cron (once per day, adjust to taste):
    0 8 * * * /path/to/venv/bin/python /path/to/manage.py fetch_rss_posts
"""

import feedparser
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from microblog.models import Post, Tag
from microblog.models.scheduled_post_config import ScheduledPostConfig


class Command(BaseCommand):
    help = 'Fetch RSS feeds and publish scheduled microblog posts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--config-id',
            type=int,
            default=None,
            help='Only process the ScheduledPostConfig with this ID (default: all active)',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Parse feeds and report what would be published without saving anything',
        )

    def handle(self, *args, **options):
        config_id = options['config_id']
        dry_run = options['dry_run']

        qs = ScheduledPostConfig.objects.filter(is_active=True).prefetch_related('tags')
        if config_id is not None:
            qs = qs.filter(pk=config_id)

        if not qs.exists():
            self.stdout.write('No active configs found.')
            return

        for config in qs:
            self._process_config(config, dry_run)

    def _process_config(self, config, dry_run):
        self.stdout.write(f'Processing config "{config.name}" ({config.rss_url})')
        try:
            feed = feedparser.parse(config.rss_url)
        except Exception as exc:
            self.stderr.write(f'  ERROR fetching feed: {exc}')
            return

        if feed.bozo and not feed.entries:
            self.stderr.write(f'  ERROR parsing feed: {feed.bozo_exception}')
            return

        entries = feed.entries
        if not entries:
            self.stdout.write('  No entries in feed.')
            return

        # Collect GUIDs already seen — stop at last_item_guid
        seen_guid = config.last_item_guid
        new_entries = []
        for entry in entries:
            guid = getattr(entry, 'id', None) or getattr(entry, 'link', None) or ''
            if guid and guid == seen_guid:
                break
            new_entries.append((guid, entry))

        if not new_entries:
            self.stdout.write('  No new entries since last fetch.')
            if not dry_run:
                config.last_fetched_at = timezone.now()
                config.save(update_fields=['last_fetched_at'])
            return

        # Publish up to posts_per_day (most-recent-first is RSS default)
        to_publish = new_entries[:config.posts_per_day]
        now = timezone.now()
        period_end = now + timedelta(hours=config.display_duration_hours)
        newest_guid = to_publish[0][0]

        for guid, entry in to_publish:
            title = getattr(entry, 'title', '')
            summary = getattr(entry, 'summary', '') or getattr(entry, 'description', '')
            link = getattr(entry, 'link', '')

            # Build post content: title + summary excerpt + link
            parts = []
            if title:
                parts.append(title)
            if summary:
                # Strip HTML tags
                from html.parser import HTMLParser

                class _Strip(HTMLParser):
                    def __init__(self):
                        super().__init__()
                        self._chunks = []

                    def handle_data(self, data):
                        self._chunks.append(data)

                    def get_text(self):
                        return ' '.join(self._chunks).strip()

                stripper = _Strip()
                stripper.feed(summary)
                plain = stripper.get_text()
                if plain:
                    parts.append(plain[:300])
            if link:
                parts.append(link)

            content = '\n'.join(parts)[:666]

            if dry_run:
                self.stdout.write(
                    f'  [DRY RUN] Would publish: {content[:80]!r} (guid={guid!r})'
                )
                continue

            post = Post.objects.create(
                author=config.author,
                content=content,
                type=config.post_type,
                period_end=period_end,
            )
            for tag in config.tags.all():
                post.tags.add(tag)

            self.stdout.write(f'  Published post #{post.pk}: {content[:60]!r}')

        if not dry_run:
            config.last_fetched_at = now
            config.last_item_guid = newest_guid
            config.save(update_fields=['last_fetched_at', 'last_item_guid'])
            self.stdout.write(f'  Updated last_fetched_at and last_item_guid.')
