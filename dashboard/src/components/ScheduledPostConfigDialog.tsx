import React, { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

import type { ScheduledPostConfig, ScheduledPostConfigPayload } from '../services/api';
import {
  useGetScheduledPostConfigsQuery,
  useCreateScheduledPostConfigMutation,
  useUpdateScheduledPostConfigMutation,
  useDeleteScheduledPostConfigMutation,
} from '../services/api';

const POST_TYPES = [
  { value: 'default', label: 'Default' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'tips', label: 'Tips' },
  { value: 'question', label: 'Question' },
  { value: 'warning', label: 'Warning' },
  { value: 'celebration', label: 'Celebration' },
];

const EMPTY_FORM: ScheduledPostConfigPayload = {
  name: '',
  rss_url: '',
  post_type: 'default',
  posts_per_day: 1,
  display_duration_hours: 24,
  is_active: true,
  tags: [],
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function ScheduledPostConfigDialog({ open, onClose }: Props) {
  const { data: configs = [], isLoading } = useGetScheduledPostConfigsQuery(undefined, { skip: !open });
  const [createConfig, { isLoading: isCreating }] = useCreateScheduledPostConfigMutation();
  const [updateConfig, { isLoading: isUpdating }] = useUpdateScheduledPostConfigMutation();
  const [deleteConfig] = useDeleteScheduledPostConfigMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduledPostConfig | null>(null);
  const [form, setForm] = useState<ScheduledPostConfigPayload>(EMPTY_FORM);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const isSaving = isCreating || isUpdating;

  useEffect(() => {
    if (formOpen && editing) {
      setForm({
        name: editing.name,
        rss_url: editing.rss_url,
        post_type: editing.post_type,
        posts_per_day: editing.posts_per_day,
        display_duration_hours: editing.display_duration_hours,
        is_active: editing.is_active,
        tags: (editing.tags || []).map((t) => t.name),
      });
    } else if (formOpen) {
      setForm(EMPTY_FORM);
      setTagInput('');
      setError('');
    }
  }, [formOpen, editing]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (config: ScheduledPostConfig) => {
    setEditing(config);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
    setError('');
  };

  const addTag = () => {
    const name = tagInput.trim().replace(/^#+/, '');
    if (name && !form.tags.includes(name)) {
      setForm((f) => ({ ...f, tags: [...f.tags, name] }));
    }
    setTagInput('');
  };

  const removeTag = (name: string) => {
    setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== name) }));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required.'); return; }
    if (!form.rss_url.trim()) { setError('RSS URL is required.'); return; }
    setError('');
    try {
      if (editing) {
        await updateConfig({ id: editing.id, ...form }).unwrap();
      } else {
        await createConfig(form).unwrap();
      }
      closeForm();
    } catch {
      setError(`Failed to ${editing ? 'update' : 'create'} config. Please try again.`);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteConfig(id);
    setConfirmDeleteId(null);
  };

  return (
    <>
      {/* Main list dialog */}
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Scheduled Post Configs
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={openCreate}>
              New
            </Button>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : configs.length === 0 ? (
            <Box sx={{ px: 3, py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                No scheduled configs yet. Create one to start auto-posting from an RSS feed.
              </Typography>
            </Box>
          ) : (
            <Stack divider={<Divider />}>
              {configs.map((config) => (
                <Box key={config.id} sx={{ px: 3, py: 2 }}>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="subtitle2" noWrap>{config.name}</Typography>
                        <Chip
                          label={config.is_active ? 'Active' : 'Paused'}
                          size="small"
                          color={config.is_active ? 'success' : 'default'}
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                        <Chip
                          label={config.post_type}
                          size="small"
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      </Stack>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', mt: 0.25 }}>
                        {config.rss_url}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {config.posts_per_day} post{config.posts_per_day !== 1 ? 's' : ''}/day
                        &nbsp;·&nbsp;
                        visible {config.display_duration_hours}h
                        {config.last_fetched_at
                          ? ` · last fetched ${new Date(config.last_fetched_at).toLocaleDateString()}`
                          : ' · never fetched'}
                      </Typography>
                      {config.tags.length > 0 && (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                          {config.tags.map((t) => (
                            <Chip key={t.name} label={`#${t.name}`} size="small" sx={{ height: 16, fontSize: '0.6rem' }} />
                          ))}
                        </Stack>
                      )}
                    </Box>
                    <Stack direction="row" spacing={0}>
                      <IconButton size="small" onClick={() => openEdit(config)} title="Edit">
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => setConfirmDeleteId(config.id)} title="Delete">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Create / Edit form dialog */}
      <Dialog open={formOpen} onClose={closeForm} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit Config' : 'New Scheduled Config'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              fullWidth
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Company Blog RSS"
            />
            <TextField
              label="RSS URL"
              fullWidth
              value={form.rss_url}
              onChange={(e) => setForm((f) => ({ ...f, rss_url: e.target.value }))}
              placeholder="https://example.com/feed.xml"
              type="url"
            />

            <FormControl fullWidth>
              <InputLabel>Post Type</InputLabel>
              <Select
                value={form.post_type}
                label="Post Type"
                onChange={(e) => setForm((f) => ({ ...f, post_type: e.target.value }))}
              >
                {POST_TYPES.map((pt) => (
                  <MenuItem key={pt.value} value={pt.value}>{pt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Posts per day"
                type="number"
                fullWidth
                value={form.posts_per_day}
                onChange={(e) => setForm((f) => ({ ...f, posts_per_day: Math.max(1, parseInt(e.target.value) || 1) }))}
                inputProps={{ min: 1, max: 100 }}
                helperText="Max items published per fetch run"
              />
              <TextField
                label="Display duration (hours)"
                type="number"
                fullWidth
                value={form.display_duration_hours}
                onChange={(e) => setForm((f) => ({ ...f, display_duration_hours: Math.max(1, parseInt(e.target.value) || 24) }))}
                inputProps={{ min: 1 }}
                helperText="How long each post stays visible"
              />
            </Stack>

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
                <Button variant="outlined" size="small" onClick={addTag} sx={{ height: 40 }}>
                  <AddIcon fontSize="small" />
                </Button>
              </Stack>
              {form.tags.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1 }}>
                  {form.tags.map((tag) => (
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

            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
              }
              label="Active"
            />

            {error && (
              <Typography color="error" variant="body2">{error}</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeForm} disabled={isSaving}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving || !form.name.trim() || !form.rss_url.trim()}
          >
            {isSaving ? 'Saving…' : editing ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={confirmDeleteId !== null} onClose={() => setConfirmDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete config?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">This will not delete already-published posts.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => confirmDeleteId !== null && handleDelete(confirmDeleteId)}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
