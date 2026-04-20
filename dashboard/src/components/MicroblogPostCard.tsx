import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import PushPinIcon from '@mui/icons-material/PushPin';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import type { MicroblogPost } from './MicroblogFeed';
import MicroblogPostForm from './MicroblogPostForm';
import useResolvedThemeMode from './useResolvedThemeMode';
import { useLikeMicroblogPostMutation, useDeleteMicroblogPostMutation } from '../services/api';

type MicroblogPostCardProps = {
  post: MicroblogPost;
  themeMode?: 'light' | 'dark' | 'auto';
};

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

function formatPostTime(createdAt: string) {
  const parsedDate = new Date(createdAt);
  if (Number.isNaN(parsedDate.getTime())) return createdAt;
  return formatDistanceToNow(parsedDate, { addSuffix: true }).replace(/^about /, '');
}

function formatPinState(post: MicroblogPost) {
  if (!post.isPinned) return null;
  if (!post.pinValidUntil) return 'Pinned';
  const pinDate = new Date(post.pinValidUntil);
  if (Number.isNaN(pinDate.getTime())) return 'Pinned';
  if (pinDate < new Date()) return null;
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
        <a key={`${part}-${index}`} href={part} target="_blank" rel="noreferrer" className="microblog-link">
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

  const [liked, setLiked] = useState(post.liked ?? false);
  const [likesCount, setLikesCount] = useState(post.likesCount ?? 0);
  const [likePost] = useLikeMicroblogPostMutation();
  const [deletePost, { isLoading: isDeleting }] = useDeleteMicroblogPostMutation();

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const MAX_LINES = 4;

  const handleLike = async () => {
    const optimisticLiked = !liked;
    setLiked(optimisticLiked);
    setLikesCount((c) => c + (optimisticLiked ? 1 : -1));
    try {
      const result = await likePost(post.id).unwrap();
      setLiked(result.liked);
      setLikesCount(result.likesCount);
    } catch {
      setLiked(!optimisticLiked);
      setLikesCount((c) => c + (optimisticLiked ? -1 : 1));
    }
  };

  const handleDelete = async () => {
    await deletePost(post.id);
    setConfirmDeleteOpen(false);
  };

  return (
    <>
      <Box className={`microblog-post microblog-theme-${resolvedThemeMode} microblog-post-${cardType}`}>
        <Box className="microblog-avatar">{renderAvatar(post)}</Box>

        <Box className="microblog-body">
          <Box className="microblog-meta">
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="subtitle1" className="author-name">
                {post.authorName}
              </Typography>
              <Typography variant="body2" className="post-time">
                {formatPostTime(post.createdAt)}
              </Typography>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={0.5}>
              {formatPinState(post) ? (
                <Box className="pin-badge">
                  <PushPinIcon fontSize="small" />
                </Box>
              ) : null}

              {post.isOwner && (
                <IconButton
                  size="small"
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                  className="post-action"
                  sx={{ ml: 0.5 }}
                >
                  <MoreHorizIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          </Box>

          <Typography
            variant="body1"
            className="post-content"
            sx={!expanded ? {
              display: '-webkit-box',
              WebkitLineClamp: MAX_LINES,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            } : undefined}
          >
            {renderContentWithLinks(post.content)}
          </Typography>
          {post.content.split('\n').length > MAX_LINES || post.content.length > 300 ? (
            <Typography
              variant="body2"
              onClick={() => setExpanded((v) => !v)}
              sx={{ cursor: 'pointer', mt: 0.5, fontWeight: 500, opacity: 0.7, fontSize: '0.75rem' }}
            >
              {expanded ? 'Show less' : 'Show more'}
            </Typography>
          ) : null}

          {post.tags && post.tags.length > 0 ? (
            <Stack direction="row" spacing={1} className="tag-list" flexWrap="wrap">
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
              className={`post-action like-action ${liked ? 'is-liked' : 'is-default'}`}
              disableRipple
              onClick={handleLike}
            >
              <FavoriteBorderIcon fontSize="small" className="like-icon-outline" />
              <FavoriteIcon fontSize="small" className="like-icon-filled" />
              <span>{likesCount}</span>
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Owner actions menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setEditOpen(true);
          }}
        >
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          Edit
        </MenuItem>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setConfirmDeleteOpen(true);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          Delete
        </MenuItem>
      </Menu>

      {/* Edit form */}
      <MicroblogPostForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        post={post}
      />

      {/* Delete confirmation */}
      <Dialog open={confirmDeleteOpen} onClose={() => setConfirmDeleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete post?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">This cannot be undone.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDeleteOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
