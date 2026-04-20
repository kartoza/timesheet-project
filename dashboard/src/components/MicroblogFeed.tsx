import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

import '../styles/Microblog.scss';
import MicroblogPostCard from './MicroblogPostCard';
import MicroblogPostForm from './MicroblogPostForm';
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
  periodStart?: string | null;
  periodEnd?: string | null;
  tags?: MicroblogTag[];
  likesCount?: number;
  liked?: boolean;
  isOwner?: boolean;
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
  hasMore?: boolean;
  onLoadMore?: () => void;
};

export default function MicroblogFeed(props: MicroblogFeedProps) {
  const { posts, title = 'Feeds', themeMode = 'light', compact = false, hasMore = false, onLoadMore } = props;
  const resolvedThemeMode = useResolvedThemeMode(themeMode);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <Paper className={`microblog-theme-${resolvedThemeMode} microblog-feed-compact sidebar-card`}>
      <Box className="microblog-header" sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography fontSize={15}>{title}</Typography>
        <IconButton size="small" onClick={() => setFormOpen(true)} title="New post">
          <AddCircleOutlineIcon fontSize="small" />
        </IconButton>
      </Box>

      <MicroblogPostForm open={formOpen} onClose={() => setFormOpen(false)} />

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
          {hasMore && (
            <Box sx={{ display: 'flex', justifyContent: 'center', pt: 1, pb: 0.5 }}>
              <Button size="small" onClick={onLoadMore} variant="text">
                Show more
              </Button>
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
}
