import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  TextField,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
    TableSortLabel
} from '@mui/material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import UserAutocomplete from "./UserAutocomplete";
import {theme} from "../utils/Theme";
import {ThemeProvider} from "@mui/material/styles";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

/**
 * Simple dashboard for the Employee Summary API
 * Endpoint expected: /api/employee-summary/:user_id?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Props:
 *  - userId (string): required user id to query
 *  - defaultFrom / defaultTo (YYYY-MM-DD): optional initial range
 */
export default function EmployeeSummaryDashboard({ userId, defaultFrom, defaultTo }: { userId?: string; defaultFrom?: string; defaultTo?: string; }) {
  const [uid, setUid] = useState<string>(userId || '');
  const [from, setFrom] = useState<Date | null>(defaultFrom ? new Date(defaultFrom) : null);
  const [to, setTo] = useState<Date | null>(defaultTo ? new Date(defaultTo) : null);

  const [rangePreset, setRangePreset] = useState<string>('custom');

  const [taskQuery, setTaskQuery] = useState('');
  const [taskProjectFilter, setTaskProjectFilter] = useState<'any' | string>('any');
  const [taskIfFilter,      setTaskIfFilter]      = useState<'any' | 'within' | 'below' | 'above' | 'n/a'>('any');
  const [taskSizeFilter,    setTaskSizeFilter]    = useState<'any' | 0 | 1 | 2 | 3 | 5 | 8>('any');

  const [taskSortBy,  setTaskSortBy]  = useState<'hours'|'size'|'description'|'project'|'if'>('hours');
  const [taskSortDir, setTaskSortDir] = useState<'asc'|'desc'>('desc');

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const applyPreset = (preset: string) => {
    setRangePreset(preset);
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    if (preset === 'this_month') {
      setFrom(startOfMonth);
      setTo(today);
    } else if (preset === 'last_7') {
      setFrom(addDays(today, -6));
      setTo(today);
    } else if (preset === 'last_30') {
      setFrom(addDays(today, -29));
      setTo(today);
    } else if (preset === 'this_quarter') {
      const q = Math.floor(today.getMonth() / 3);
      setFrom(new Date(today.getFullYear(), q * 3, 1));
      setTo(today);
    } // 'custom' leaves dates as-is
  };

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);

  const hasRange = from && to;

  const buildUrl = () => {
    if (!uid) return '';
    const p = new URLSearchParams();
    if (from) p.set('from', fmt(from));
    if (to) p.set('to', fmt(to));
    const qs = p.toString();
    return `/api/employee-summary/${uid}${qs ? `?${qs}` : ''}`;
  };

  const load = () => {
    const url = buildUrl();
    if (!url) return;
    setLoading(true);
    setError(null);
    setData(null);
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        setData(json);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  };

  // Auto-load when userId provided via props
  useEffect(() => {
    if (userId && !uid) setUid(userId);
  }, [userId]);

  useEffect(() => {
    if (uid && (from || to)) {
      load();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const chartData = useMemo(() => {
    if (!data?.chart) return null;
    const labels: string[] = data.chart.labels || [];
    const hours: number[] = data.chart.series?.hours || [];
    const billable: number[] = data.chart.series?.billable_hours || [];

    return {
      labels,
      datasets: [
        {
          label: 'Hours (total)',
          data: hours,
          borderColor: '#004687',
          backgroundColor: 'rgba(0,70,135,0.25)',
          fill: true,
          tension: 0.25,
        },
        {
          label: 'Billable Hours',
          data: billable,
          borderColor: '#FFD321',
          backgroundColor: 'rgba(255,211,33,0.25)',
          fill: true,
          tension: 0.25,
        }
      ],
    };
  }, [data]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
      title: {
        display: true,
        text: data?.chart?.granularity === 'monthly' ? 'Monthly Summary' : 'Weekly Summary',
      },
      tooltip: { mode: 'index' as const, intersect: false },
    },
    interaction: { mode: 'index' as const, intersect: false },
    scales: {
      x: {
        title: { display: true, text: data?.chart?.granularity === 'monthly' ? 'Month' : 'Week' },
      },
      y: {
        title: { display: true, text: 'Hours' },
        beginAtZero: true,
      },
    },
  }), [data]);

  const totals = data?.totals;
  const period = data?.period;
  const projects = data?.breakdown?.by_project || [];

  const sizeExpectedRange = (size?: number): [number | null, number | null] => {
    if (!size && size !== 0) return [null, null];
    switch (size) {
      case 0: return [null, null];
      case 1: return [0, 2];
      case 2: return [1, 3];
      case 3: return [2, 6];
      case 5: return [5, 9];
      case 8: return [8, 10];
      default:
        if (size <= 1) return [0, 1];
        if (size <= 2) return [1, 2];
        if (size <= 5) return [2, 5];
        if (size <= 8) return [5, 8];
        return [8, null];
    }
  };

  const hoursVsSizeLabel = (hours: number, size?: number) => {
    const [minH, maxH] = sizeExpectedRange(size);
    if (minH === null && maxH === null) return 'n/a';
    if (hours < (minH ?? 0)) return 'below';
    if (maxH == null) return 'within';
    if (hours <= maxH) return 'within';
    return 'above';
  };

  const tasksTable = useMemo(() => {
    const provided = data?.breakdown?.tasks_table;
    if (Array.isArray(provided)) return provided as Array<any>;

    // Fallback for older API: derive from task_descriptions map
    const map = data?.task_descriptions || {};
    const rows: Array<any> = Object.entries(map).map(([desc, info]: any) => {
      const size = Number(info?.size ?? 0);
      const hours = Number(info?.hours ?? 0);
      return {
        description: desc,
        project: info?.project || 'Unknown',
        hours,
        size,
        if: hoursVsSizeLabel(hours, size),
        done: '',
        link: info?.link || null,
      };
    });
    rows.sort((a, b) => b.hours - a.hours);
    return rows;
  }, [data]);

  // Distinct projects for filter dropdown
  const taskProjectOptions = useMemo(
    () => Array.from(new Set((tasksTable ?? []).map((r: any) => r.project))).sort(),
    [tasksTable]
  );

  const filteredSortedTasks = useMemo(() => {
    let rows = (tasksTable ?? []) as any[];
    if (taskQuery.trim()) {
      const q = taskQuery.toLowerCase();
      rows = rows.filter(r =>
        String(r.description || '').toLowerCase().includes(q) ||
        String(r.project || '').toLowerCase().includes(q)
      );
    }
    if (taskProjectFilter !== 'any') {
      rows = rows.filter(r => r.project === taskProjectFilter);
    }
    if (taskIfFilter !== 'any') {
      rows = rows.filter(r => (r.if || 'n/a') === taskIfFilter);
    }
    if (taskSizeFilter !== 'any') {
      rows = rows.filter(r => Number(r.size ?? 0) === Number(taskSizeFilter));
    }
    const cmp = (a: any, b: any) => {
      const dir = taskSortDir === 'asc' ? 1 : -1;
      const key = taskSortBy;

      if (key === 'hours' || key === 'size') {
        const av = Number(a[key] ?? 0);
        const bv = Number(b[key] ?? 0);
        return av === bv ? 0 : (av < bv ? -1*dir : 1*dir);
      } else if (key === 'if') {
        // Order: within < below < above < n/a (tweak if you prefer)
        const order = { within: 0, below: 1, above: 2, 'n/a': 3 } as any;
        const av = order[(a.if || 'n/a')] ?? 99;
        const bv = order[(b.if || 'n/a')] ?? 99;
        return av === bv ? 0 : (av < bv ? -1*dir : 1*dir);
      } else {
        const av = String(a[key] ?? '').toLowerCase();
        const bv = String(b[key] ?? '').toLowerCase();
        return av === bv ? 0 : (av < bv ? -1*dir : 1*dir);
      }
    };

    return rows.slice().sort(cmp);
  }, [tasksTable, taskQuery, taskProjectFilter, taskIfFilter, taskSizeFilter, taskSortBy, taskSortDir]);

  return (
    <ThemeProvider theme={theme}>
    <Box p={2}>
      <Typography variant="h5" sx={{ mb: 2 }}>Employee Insight</Typography>

      {/* Controls */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <UserAutocomplete onUserSelected={(selectedUser) => selectedUser && setUid(selectedUser.id)} />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel id="preset-label">Date Range</InputLabel>
                <Select
                  labelId="preset-label"
                  label="Date Range"
                  value={rangePreset}
                  onChange={(e) => applyPreset(e.target.value as string)}
                >
                  <MenuItem value="this_month">This Month (MTD)</MenuItem>
                  <MenuItem value="last_7">Last 7 days</MenuItem>
                  <MenuItem value="last_30">Last 30 days</MenuItem>
                  <MenuItem value="this_quarter">This Quarter (QTD)</MenuItem>
                  <MenuItem value="custom">Custom…</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="From"
                  value={from}
                  onChange={(newValue) => setFrom(newValue)}
                  format="dd/MM/yyyy"
                  slotProps={{ textField: { fullWidth: true } }}
                  className="date-picker-input"
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="To"
                  value={to}
                  onChange={(newValue) => setTo(newValue)}
                  format="dd/MM/yyyy"
                  slotProps={{ textField: { fullWidth: true } }}
                  className="date-picker-input"
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                fullWidth
                size="large"
                variant="contained"
                onClick={load}
                disabled={!uid || !hasRange || loading}
              >
                {loading ? 'Loading…' : 'Load Summary'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* State */}
      {error && (
        <Card variant="outlined" sx={{ mb: 2 }}>
          <CardContent>
            <Typography color="error">{error}</Typography>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Box textAlign="center" py={6}>
          <CircularProgress />
        </Box>
      )}

      {data && !loading && (
        <>
          {/* KPIs */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined"><CardContent>
                <Typography variant="body2" color="text.secondary">Total Hours</Typography>
                <Typography variant="h5">{totals?.hours?.toFixed(2)}</Typography>
                <Chip size="small" sx={{ mt: 1 }} label={`Avg/day ${totals?.avg_hours_per_day ?? 0}`} />
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined"><CardContent>
                <Typography variant="body2" color="text.secondary">Billable Hours</Typography>
                <Typography variant="h5">{totals?.billable_hours?.toFixed(2)}</Typography>
                <Chip size="small" sx={{ mt: 1 }} color="primary" label={`Utilization ${totals?.utilization_pct ?? 0}%`} />
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined"><CardContent>
                <Typography variant="body2" color="text.secondary">Billing</Typography>
                <Typography variant="h5">{(totals?.billing ?? 0).toLocaleString()}</Typography>
                <Chip size="small" sx={{ mt: 1 }} color="success" label={`Rate ${totals?.realized_rate_per_hour ?? 0}/h`} />
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card variant="outlined"><CardContent>
                <Typography variant="body2" color="text.secondary">Costing</Typography>
                <Typography variant="h5">{(totals?.costing ?? 0).toLocaleString()}</Typography>
                <Chip size="small" sx={{ mt: 1 }} color="warning" label={`Margin ${(totals?.margin ?? 0).toLocaleString()}`} />
              </CardContent></Card>
            </Grid>
          </Grid>

          {/* Period info */}
          <Typography variant="body2" sx={{ mb: 1 }} color="text.secondary">
            Period: {period?.from} → {period?.to} ({period?.days_count} days) · Granularity: {data?.chart?.granularity}
          </Typography>

          {/* Chart */}
          <Card variant="outlined" sx={{ mb: 3, height: 420 }}>
            <CardContent sx={{ height: '100%' }}>
              {chartData ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <Box py={8} textAlign="center"><Typography color="text.secondary">No chart data</Typography></Box>
              )}
            </CardContent>
          </Card>

          {/* By Project table */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>By Project</Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Project</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Hours</TableCell>
                      <TableCell align="right">Billable</TableCell>
                      <TableCell align="right">Utilization %</TableCell>
                      <TableCell align="right">Billing</TableCell>
                      <TableCell align="right">Costing</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {projects.map((p: any) => (
                      <TableRow key={p.project}>
                        <TableCell>{p.project}</TableCell>
                        <TableCell>{p.project_type}</TableCell>
                        <TableCell align="right">{p.hours?.toFixed(2)}</TableCell>
                        <TableCell align="right">{p.billable_hours?.toFixed(2)}</TableCell>
                        <TableCell align="right">{p.utilization_pct?.toFixed(1)}</TableCell>
                        <TableCell align="right">{(p.billing ?? 0).toLocaleString()}</TableCell>
                        <TableCell align="right">{(p.costing ?? 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>By Task</Typography>
              <Box sx={{ mb: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                  <TextField
                    fullWidth
                    label="Search description or project"
                    value={taskQuery}
                    onChange={(e) => setTaskQuery(e.target.value)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="task-project-label">Project</InputLabel>
                    <Select
                      labelId="task-project-label"
                      label="Project"
                      value={taskProjectFilter}
                      onChange={(e) => setTaskProjectFilter(e.target.value as any)}
                    >
                      <MenuItem value="any">All</MenuItem>
                      {taskProjectOptions.map(p => (
                        <MenuItem key={p} value={p}>{p}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="task-if-label">Hrs vs Size</InputLabel>
                    <Select
                      labelId="task-if-label"
                      label="Hrs vs Size"
                      value={taskIfFilter}
                      onChange={(e) => setTaskIfFilter(e.target.value as any)}
                    >
                      <MenuItem value="any">All</MenuItem>
                      <MenuItem value="within">Within</MenuItem>
                      <MenuItem value="below">Below</MenuItem>
                      <MenuItem value="above">Above</MenuItem>
                      <MenuItem value="n/a">N/A</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="task-size-label">Size</InputLabel>
                    <Select
                      labelId="task-size-label"
                      label="Size"
                      value={taskSizeFilter}
                      onChange={(e) => setTaskSizeFilter(e.target.value as any)}
                    >
                      <MenuItem value="any">Any</MenuItem>
                      <MenuItem value={0}>0</MenuItem>
                      <MenuItem value={1}>1</MenuItem>
                      <MenuItem value={2}>2</MenuItem>
                      <MenuItem value={3}>3</MenuItem>
                      <MenuItem value={5}>5</MenuItem>
                      <MenuItem value={8}>8</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sortDirection={taskSortBy === 'description' ? taskSortDir : false}>
                        <TableSortLabel
                          active={taskSortBy === 'description'}
                          direction={taskSortBy === 'description' ? taskSortDir : 'asc'}
                          onClick={() => setTaskSortBy(prev => (setTaskSortDir(prev === 'description' && taskSortDir === 'asc' ? 'desc' : 'asc'), 'description'))}
                        >
                          Description
                        </TableSortLabel>
                      </TableCell>

                      <TableCell sortDirection={taskSortBy === 'project' ? taskSortDir : false}>
                        <TableSortLabel
                          active={taskSortBy === 'project'}
                          direction={taskSortBy === 'project' ? taskSortDir : 'asc'}
                          onClick={() => setTaskSortBy(prev => (setTaskSortDir(prev === 'project' && taskSortDir === 'asc' ? 'desc' : 'asc'), 'project'))}
                        >
                          Project
                        </TableSortLabel>
                      </TableCell>

                      <TableCell align="right" sortDirection={taskSortBy === 'hours' ? taskSortDir : false}>
                        <TableSortLabel
                          active={taskSortBy === 'hours'}
                          direction={taskSortBy === 'hours' ? taskSortDir : 'desc'}
                          onClick={() => setTaskSortBy(prev => (setTaskSortDir(prev === 'hours' && taskSortDir === 'asc' ? 'desc' : 'asc'), 'hours'))}
                        >
                          Hours
                        </TableSortLabel>
                      </TableCell>

                      <TableCell align="right" sortDirection={taskSortBy === 'size' ? taskSortDir : false}>
                        <TableSortLabel
                          active={taskSortBy === 'size'}
                          direction={taskSortBy === 'size' ? taskSortDir : 'asc'}
                          onClick={() => setTaskSortBy(prev => (setTaskSortDir(prev === 'size' && taskSortDir === 'asc' ? 'desc' : 'asc'), 'size'))}
                        >
                          Size
                        </TableSortLabel>
                      </TableCell>

                      <TableCell align="right" sortDirection={taskSortBy === 'if' ? taskSortDir : false}>
                        <TableSortLabel
                          active={taskSortBy === 'if'}
                          direction={taskSortBy === 'if' ? taskSortDir : 'asc'}
                          onClick={() => setTaskSortBy(prev => (setTaskSortDir(prev === 'if' && taskSortDir === 'asc' ? 'desc' : 'asc'), 'if'))}
                        >
                          Hrs vs Size
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Link</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredSortedTasks && filteredSortedTasks.length > 0 ? (
                      filteredSortedTasks.map((row: any, idx: number) => (
                        <TableRow key={`${row.description}-${idx}`}>
                          <TableCell>{row.description}</TableCell>
                          <TableCell>{row.project}</TableCell>
                          <TableCell align="right">{Number(row.hours).toFixed(3)}</TableCell>
                          <TableCell align="right">{row.size ?? 0}</TableCell>
                          <TableCell align="right">
                            <Chip
                              size="small"
                              label={row.if || 'n/a'}
                              color={
                                row.if === 'within' ? 'success'
                                : row.if === 'below' ? 'warning'
                                : row.if === 'above' ? 'error'
                                : 'default'
                              }
                              variant={row.if ? 'filled' : 'outlined'}
                            />
                          </TableCell>
                          <TableCell>
                            {row.link ? (
                              <a href={row.link} target="_blank" rel="noreferrer">Open</a>
                            ) : (
                              <Typography variant="caption" color="text.secondary">—</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <Typography variant="body2" color="text.secondary">No tasks to display</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Meta */}
          <Typography variant="caption" color="text.secondary">
            Entries: {data?.meta?.entries_count ?? 0} · Generated: {data?.date_now} · Month start: {data?.start_of_month}
          </Typography>
        </>
      )}
    </Box>
    </ThemeProvider>
  );
}
