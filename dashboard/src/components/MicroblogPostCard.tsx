import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PushPinIcon from '@mui/icons-material/PushPin';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';

import type { MicroblogPost } from './MicroblogFeed';
import useResolvedThemeMode from './useResolvedThemeMode';

type MicroblogPostCardProps = {
  post: MicroblogPost;
  themeMode?: 'light' | 'dark' | 'auto';
};

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

function formatPostTime(createdAt: string) {
  const parsedDate = new Date(createdAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return createdAt;
  }

  return formatDistanceToNow(parsedDate, { addSuffix: true });
}

function formatPinState(post: MicroblogPost) {
  if (!post.isPinned) {
    return null;
  }

  if (!post.pinValidUntil) {
    return 'Pinned';
  }

  const pinDate = new Date(post.pinValidUntil);

  if (Number.isNaN(pinDate.getTime())) {
    return 'Pinned';
  }

  return `Pinned until ${pinDate.toLocaleDateString()}`;
}

function renderAvatar(post: MicroblogPost) {
  if (post.avatarUrl) {
    return <Avatar src={post.avatarUrl} alt={post.authorName} />;
  }

  return <Avatar>{post.authorName.slice(0, 1).toUpperCase()}</Avatar>;
}

function renderContentWithLinks(content: string) {
  return content.split(URL_PATTERN).map((part, index) => {
    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a
          key={`${part}-${index}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="microblog-link"
        >
          {part}
        </a>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

export default function MicroblogPostCard(props: MicroblogPostCardProps) {
  const { post, themeMode = 'light' } = props;
  const resolvedThemeMode = useResolvedThemeMode(themeMode);
  const cardType = post.type || 'default';

  return (
    <Box
      className={`microblog-post microblog-theme-${resolvedThemeMode} microblog-post-${cardType}`}
    >
      <Box className="microblog-avatar">{renderAvatar(post)}</Box>

      <Box className="microblog-body">
        <Box className="microblog-meta">
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
          >
            <Typography variant="subtitle1" className="author-name">
              {post.authorName}
            </Typography>
            <Typography variant="body2" className="post-time">
              {formatPostTime(post.createdAt)}
            </Typography>
          </Stack>

          {post.isPinned ? (
            <Box className="pin-badge">
              <PushPinIcon fontSize="small" />
            </Box>
          ) : null}
        </Box>

        <Typography variant="body1" className="post-content">
          {renderContentWithLinks(post.content)}
        </Typography>

        {post.tags && post.tags.length > 0 ? (
          <Stack
            direction="row"
            spacing={1}
            className="tag-list"
            flexWrap="wrap"
          >
            {post.tags.map((tag) => (
              <Chip
                key={tag.id || tag.name}
                size="small"
                label={`#${tag.name}`}
                className="tag-chip"
              />
            ))}
          </Stack>
        ) : null}

        <Box className="post-actions">
          <IconButton
            size="small"
            className={`post-action like-action ${post.liked ? 'is-liked' : 'is-default'}`}
            disableRipple
          >
            <FavoriteBorderIcon fontSize="small" className="like-icon-outline" />
            <FavoriteIcon fontSize="small" className="like-icon-filled" />
            <span>{post.likesCount || 0}</span>
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
