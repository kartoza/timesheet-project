import type { Meta, StoryObj } from '@storybook/react';

import MicroblogPostCard from './MicroblogPostCard';

const meta: Meta<typeof MicroblogPostCard> = {
  title: 'Components/MicroblogPostCard',
  component: MicroblogPostCard,
};

export default meta;

type Story = StoryObj<typeof MicroblogPostCard>;

export const Default: Story = {
  args: {
    themeMode: 'light',
    post: {
      id: 1,
      authorName: 'Maya Chen',
      authorHandle: 'maya',
      content:
        'Shipped the first pass of the microblog timeline today. Next step is wiring real API data into the feed and composer. Docs: https://timesheets.kartoza.com/docs/microblog',
      createdAt: '2026-04-16T08:15:00Z',
      isPinned: true,
      pinValidUntil: '2026-04-30T23:59:00Z',
      tags: [{ name: 'release' }, { name: 'microblog' }],
      likesCount: 32,
      liked: true,
    },
  },
};

export const Dark: Story = {
  args: {
    themeMode: 'dark',
    post: {
      id: 1,
      authorName: 'Maya Chen',
      authorHandle: 'maya',
      content:
        'This single-post card should still read cleanly on a dark surface.',
      createdAt: '2026-04-16T08:15:00Z',
      isPinned: true,
      pinValidUntil: '2026-04-30T23:59:00Z',
      tags: [{ name: 'microblog' }],
      likesCount: 32,
      liked: false,
    },
  },
  parameters: {
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#0b141a' }],
    },
  },
};

export const Announcement: Story = {
  args: {
    themeMode: 'light',
    post: {
      id: 10,
      authorName: 'Operations Desk',
      authorHandle: 'opsdesk',
      content:
        'Production maintenance starts tonight at 22:00 UTC. Expect a short interruption while we deploy the microblog rollout and database updates.',
      createdAt: '2026-04-16T18:00:00Z',
      tags: [{ name: 'announcement' }, { name: 'maintenance' }],
      likesCount: 84,
      liked: true,
      type: 'announcement',
    },
  },
};

export const Tips: Story = {
  args: {
    themeMode: 'light',
    post: {
      id: 11,
      authorName: 'Productivity Bot',
      authorHandle: 'tips',
      content:
        'Tip: keep updates short, use one clear action per post, and pin only the items people actually need to refer back to. Guide: https://kartoza.com/blog/workflow/microblog-tips',
      createdAt: '2026-04-16T19:00:00Z',
      tags: [{ name: 'tips' }, { name: 'workflow' }],
      likesCount: 27,
      liked: false,
      type: 'tips',
    },
  },
};

export const UrlAware: Story = {
  args: {
    themeMode: 'light',
    post: {
      id: 12,
      authorName: 'Maya Chen',
      authorHandle: 'maya',
      content:
        'Release notes are up at https://timesheets.kartoza.com/releases/1-0 and the follow-up issue tracker is https://github.com/kartoza/timesheet-project/issues.',
      createdAt: '2026-04-16T20:00:00Z',
      tags: [{ name: 'release' }, { name: 'links' }],
      likesCount: 14,
      liked: false,
    },
  },
};

export const Question: Story = {
  args: {
    themeMode: 'light',
    post: {
      id: 13,
      authorName: 'Maya Chen',
      authorHandle: 'maya',
      content:
        'Question: should the microblog composer support markdown links, or should we keep it plain text and auto-link URLs only?',
      createdAt: '2026-04-16T21:00:00Z',
      tags: [{ name: 'question' }, { name: 'ux' }],
      likesCount: 9,
      liked: false,
      type: 'question',
    },
  },
};

export const Warning: Story = {
  args: {
    themeMode: 'light',
    post: {
      id: 14,
      authorName: 'Ops Monitor',
      authorHandle: 'ops',
      content:
        'Warning: the staging cache is serving stale data after the latest deploy. \n\nAvoid validating API changes there until the cache reset finishes.',
      createdAt: '2026-04-16T21:10:00Z',
      tags: [{ name: 'warning' }, { name: 'staging' }],
      likesCount: 21,
      liked: true,
      type: 'warning',
    },
  },
};

export const Celebration: Story = {
  args: {
    themeMode: 'light',
    post: {
      id: 15,
      authorName: 'Team Pulse',
      authorHandle: 'pulse',
      content:
        'Celebration: the first microblog UI pass is live in Storybook and the feed now supports multiple post types cleanly.',
      createdAt: '2026-04-16T21:20:00Z',
      tags: [{ name: 'celebration' }, { name: 'milestone' }],
      likesCount: 67,
      liked: true,
      type: 'celebration',
    },
  },
};
