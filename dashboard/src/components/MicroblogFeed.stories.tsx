import type { Meta, StoryObj } from '@storybook/react';

import MicroblogFeed from './MicroblogFeed';

const meta: Meta<typeof MicroblogFeed> = {
  title: 'Components/MicroblogFeed',
  component: MicroblogFeed,
};

export default meta;

type Story = StoryObj<typeof MicroblogFeed>;

export const Default: Story = {
  args: {
    title: 'Updates',
    themeMode: 'light',
    posts: [
      {
        id: 1,
        authorName: 'Operations Desk',
        authorHandle: 'opsdesk',
        content:
          'Production maintenance starts tonight at 22:00 UTC. Expect a short interruption while we deploy the microblog rollout and database updates.',
        createdAt: '2026-04-16T08:15:00Z',
        isPinned: true,
        pinValidUntil: '2026-04-30T23:59:00Z',
        tags: [{ name: 'announcement' }, { name: 'maintenance' }],
        likesCount: 0,
        liked: false,
        type: 'announcement',
      },
      {
        id: 2,
        authorName: 'Daniel Smith',
        authorHandle: 'daniel',
        content:
          'Terrain basemap cleanup is next on my list. If we standardize map layer selection now, the rest of the dashboard gets simpler fast. Draft: https://github.com/kartoza/timesheet-project/pull/123',
        createdAt: '2026-04-16T10:45:00Z',
        tags: [{ name: 'maps' }, { name: 'frontend' }],
        likesCount: 18,
        liked: false,
      },
      {
        id: 3,
        authorName: 'Zinhle Mokoena',
        authorHandle: 'zinhle',
        content:
          'Short posts feel better when the layout stays sharp. Keeping the hierarchy tight, the spacing calm, and the actions lightweight makes a big difference. Reference board: https://www.figma.com/file/example',
        createdAt: '2026-04-16T12:20:00Z',
        tags: [{ name: 'design' }],
        likesCount: 54,
        liked: false,
      },
      {
        id: 4,
        authorName: 'Productivity Bot',
        authorHandle: 'tips',
        content:
          'Tip: keep updates short, use one clear action per post, and pin only the items people actually need to refer back to. Guide: https://kartoza.com/blog/workflow/microblog-tips',
        createdAt: '2026-04-16T14:35:00Z',
        tags: [{ name: 'tips' }, { name: 'workflow' }],
        likesCount: 27,
        liked: false,
        type: 'tips',
      },
      {
        id: 5,
        authorName: 'Maya Chen',
        authorHandle: 'maya',
        content:
          'Question: should the microblog composer support markdown links, or should we keep it plain text and auto-link URLs only?',
        createdAt: '2026-04-16T15:20:00Z',
        tags: [{ name: 'question' }, { name: 'ux' }],
        likesCount: 9,
        liked: false,
        type: 'question',
      },
      {
        id: 6,
        authorName: 'Ops Monitor',
        authorHandle: 'ops',
        content:
          'Warning: the staging cache is serving stale data after the latest deploy. Avoid validating API changes there until the cache reset finishes.',
        createdAt: '2026-04-16T15:45:00Z',
        tags: [{ name: 'warning' }, { name: 'staging' }],
        likesCount: 21,
        liked: true,
        type: 'warning',
      },
      {
        id: 7,
        authorName: 'Team Pulse',
        authorHandle: 'pulse',
        content:
          'Celebration: the first microblog UI pass is live in Storybook and the feed now supports multiple post types cleanly.',
        createdAt: '2026-04-16T16:10:00Z',
        tags: [{ name: 'celebration' }, { name: 'milestone' }],
        likesCount: 67,
        liked: true,
        type: 'celebration',
      },
    ],
  },
};

export const Empty: Story = {
  args: {
    title: 'Microblog',
    themeMode: 'light',
    posts: [],
  },
};

export const Dark: Story = {
  args: {
    title: 'Microblog',
    themeMode: 'dark',
    posts: [
      {
        id: 2,
        authorName: 'Operations Desk',
        authorHandle: 'opsdesk',
        content:
          'Dark surfaces should still make important announcements feel elevated without turning the whole feed into a different product.',
        createdAt: '2026-04-16T08:15:00Z',
        isPinned: true,
        pinValidUntil: '2026-04-30T23:59:00Z',
        tags: [{ name: 'announcement' }, { name: 'darkmode' }],
        likesCount: 0,
        liked: false,
        type: 'announcement',
      },
      {
        id: 3,
        authorName: 'Productivity Bot',
        authorHandle: 'tips',
        content:
          'Tip: use tags consistently. They become much more useful once the feed has enough volume to scan by topic. Notes: https://timesheets.kartoza.com/help/tags',
        createdAt: '2026-04-16T15:10:00Z',
        tags: [{ name: 'tips' }, { name: 'organization' }],
        likesCount: 15,
        liked: true,
        type: 'tips',
      },
      {
        id: 4,
        authorName: 'Maya Chen',
        authorHandle: 'maya',
        content:
          'Question: should the microblog composer support markdown links, or should we keep it plain text and auto-link URLs only?',
        createdAt: '2026-04-16T15:20:00Z',
        tags: [{ name: 'question' }, { name: 'ux' }],
        likesCount: 9,
        liked: false,
        type: 'question',
      },
      {
        id: 5,
        authorName: 'Ops Monitor',
        authorHandle: 'ops',
        content:
          'Warning: the staging cache is serving stale data after the latest deploy. Avoid validating API changes there until the cache reset finishes.',
        createdAt: '2026-04-16T15:45:00Z',
        tags: [{ name: 'warning' }, { name: 'staging' }],
        likesCount: 21,
        liked: true,
        type: 'warning',
      },
      {
        id: 6,
        authorName: 'Team Pulse',
        authorHandle: 'pulse',
        content:
          'Celebration: the first microblog UI pass is live in Storybook and the feed now supports multiple post types cleanly.',
        createdAt: '2026-04-16T16:10:00Z',
        tags: [{ name: 'celebration' }, { name: 'milestone' }],
        likesCount: 67,
        liked: true,
        type: 'celebration',
      },
    ],
  },
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: 'var(--mui-palette-background-paper)' }],
    },
  },
};
