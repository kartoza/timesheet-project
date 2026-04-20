import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import type { MicroblogPost } from './MicroblogFeed';
import { useCreateMicroblogPostMutation, useUpdateMicroblogPostMutation } from '../services/api';

const isStaff = (window as any).isStaff;

const POST_TYPES = [
  { value: 'default', label: 'Default' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'tips', label: 'Tips' },
  { value: 'question', label: 'Question' },
  { value: 'warning', label: 'Warning' },
  { value: 'celebration', label: 'Celebration' },
];


type Props = {
  open: boolean;
  onClose: () => void;
  post?: MicroblogPost; // present when editing
};

export default function MicroblogPostForm({ open, onClose, post }: Props) {
  const isEditing = !!post;

  const [content, setContent] = useState('');
  const [type, setType] = useState('default');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPinned, setIsPinned] = useState(false);
  const [pinValidUntil, setPinValidUntil] = useState<Date | null>(null);
  const [periodStart, setPeriodStart] = useState<Date | null>(null);
  const [periodEnd, setPeriodEnd] = useState<Date | null>(null);
  const [error, setError] = useState('');

  const [createPost, { isLoading: isCreating }] = useCreateMicroblogPostMutation();
  const [updatePost, { isLoading: isUpdating }] = useUpdateMicroblogPostMutation();
  const isLoading = isCreating || isUpdating;
  const pinRequiresExpiry = isPinned && !pinValidUntil;

  // Populate fields when opening in edit mode
  useEffect(() => {
    if (open && post) {
      setContent(post.content);
      setType(post.type || 'default');
      setTags((post.tags || []).map((t) => t.name));
      setIsPinned(post.isPinned ?? false);
      setPinValidUntil(post.pinValidUntil ? new Date(post.pinValidUntil) : null);
      setPeriodStart(post.periodStart ? new Date(post.periodStart) : null);
      setPeriodEnd(post.periodEnd ? new Date(post.periodEnd) : null);
    } else if (open) {
      setContent('');
      setType('default');
      setTags([]);
      setIsPinned(false);
      setPinValidUntil(null);
      setPeriodStart(null);
      setPeriodEnd(null);
      setError('');
    }
  }, [open, post]);

  const addTag = () => {
    const name = tagInput.trim().replace(/^#+/, '');
    if (name && !tags.includes(name)) {
      setTags((prev) => [...prev, name]);
    }
    setTagInput('');
  };

  const removeTag = (name: string) => {
    setTags((prev) => prev.filter((t) => t !== name));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const handleClose = () => {
    setContent('');
    setType('default');
    setTagInput('');
    setTags([]);
    setIsPinned(false);
    setPinValidUntil(null);
    setPeriodStart(null);
    setPeriodEnd(null);
    setError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError('Content is required.');
      return;
    }
    if (pinRequiresExpiry) {
      setError('Pin expiry is required when the post is pinned.');
      return;
    }
    setError('');
    const payload = {
      content: content.trim(),
      type,
      tags,
      is_pinned: isPinned,
      pin_valid_until: isPinned && pinValidUntil ? pinValidUntil.toISOString() : null,
      period_start: periodStart ? periodStart.toISOString() : null,
      period_end: periodEnd ? periodEnd.toISOString() : null,
    };
    try {
      if (isEditing) {
        await updatePost({ id: post.id, ...payload }).unwrap();
      } else {
        await createPost(payload).unwrap();
      }
      handleClose();
    } catch {
      setError(`Failed to ${isEditing ? 'update' : 'create'} post. Please try again.`);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditing ? 'Edit Post' : 'New Post'}</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Content"
            multiline
            minRows={3}
            fullWidth
            value={content}
            onChange={(e) => setContent(e.target.value)}
            error={!!error && !content.trim()}
            inputProps={{ maxLength: 666 }}
            helperText={`${content.length} / 666`}
          />

          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              value={type}
              label="Type"
              onChange={(e) => setType(e.target.value)}
            >
              {POST_TYPES.map((pt) => (
                <MenuItem key={pt.value} value={pt.value}>
                  {pt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                label="Add tag"
                size="small"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder="Press Enter to add"
                sx={{ flex: 1 }}
              />
              <Button variant="outlined" size="small" onClick={addTag} sx={{ height: "40px" }}>
                <AddIcon fontSize="small" />
              </Button>
            </Stack>

            {tags.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                {tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={`#${tag}`}
                    size="small"
                    onDelete={() => removeTag(tag)}
                    sx={{ mt: 0.5 }}
                  />
                ))}
              </Stack>
            )}
          </Box>

          {isStaff && (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isPinned}
                    onChange={(e) => {
                      setIsPinned(e.target.checked);
                      if (!e.target.checked) setPinValidUntil(null);
                    }}
                  />
                }
                label="Pin this post"
              />

              {isPinned && (
                <DateTimePicker
                  label="Pin expires on"
                  value={pinValidUntil}
                  onChange={(val) => setPinValidUntil(val)}
                  format="dd/MM/yyyy HH:mm"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      required: true,
                      error: pinRequiresExpiry,
                      helperText: pinRequiresExpiry ? 'Required when pinning a post.' : undefined,
                    },
                  }}
                />
              )}
            </>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <DateTimePicker
              label="Visible from"
              value={periodStart}
              onChange={(val) => setPeriodStart(val)}
              format="dd/MM/yyyy HH:mm"
              slotProps={{ textField: { fullWidth: true } }}
            />
            <DateTimePicker
              label="Visible until"
              value={periodEnd}
              onChange={(val) => setPeriodEnd(val)}
              format="dd/MM/yyyy HH:mm"
              slotProps={{ textField: { fullWidth: true } }}
            />
          </Stack>

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isLoading || !content.trim() || pinRequiresExpiry}
        >
          {isLoading ? (isEditing ? 'Saving…' : 'Posting…') : (isEditing ? 'Save' : 'Post')}
        </Button>
      </DialogActions>
    </Dialog>
    </LocalizationProvider>
  );
}
