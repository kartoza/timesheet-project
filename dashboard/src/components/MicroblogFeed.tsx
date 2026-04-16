import React from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import '../styles/Microblog.scss';
import MicroblogPostCard from './MicroblogPostCard';
import useResolvedThemeMode from './useResolvedThemeMode';

export type MicroblogTag = {
  id?: number;
  name: string;
};

export type MicroblogPost = {
  id: number;
  authorName: string;
  authorHandle: string;
  avatarUrl?: string;
  content: string;
  createdAt: string;
  isPinned?: boolean;
  pinValidUntil?: string | null;
  tags?: MicroblogTag[];
  likesCount?: number;
  liked?: boolean;
  type?:
    | 'default'
    | 'announcement'
    | 'tips'
    | 'question'
    | 'warning'
    | 'celebration';
};

type MicroblogFeedProps = {
  posts: MicroblogPost[];
  title?: string;
  themeMode?: 'light' | 'dark' | 'auto';
  compact?: boolean;
};

export default function MicroblogFeed(props: MicroblogFeedProps) {
  const { posts, title = 'Feeds', themeMode = 'light', compact = false } = props;
  const resolvedThemeMode = useResolvedThemeMode(themeMode);

  return (
    <Paper className={`microblog-theme-${resolvedThemeMode} microblog-feed-compact sidebar-card`}>
      <Box className="microblog-header">
        <Typography fontSize={15}>{title}</Typography>
      </Box>

      {posts.length === 0 ? (
        <Box className="microblog-empty">
          <Typography variant="h6">No posts yet</Typography>
          <Typography variant="body2">
            This feed will populate as soon as people start posting.
          </Typography>
        </Box>
      ) : (
        <Box className="microblog-list">
          {posts.map((post) => (
            <MicroblogPostCard
              key={post.id}
              post={post}
              themeMode={resolvedThemeMode}
            />
          ))}
        </Box>
      )}
    </Paper>
  );
}
