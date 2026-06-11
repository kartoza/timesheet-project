import React, { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell,
  ComposedChart, LabelList, Legend, Line,
  Pie, PieChart,
  ResponsiveContainer, XAxis, YAxis,
} from 'recharts';
import { AT_RISK_STATUS_KEYS, UI_PROJECT_KEYS } from '../../constants/pmo_dashboard';
import { UIProjectRow } from '../../types/pmo_dashboard';
import { formatManagerName } from '../../utils/pmo_dashboard';

const STATUS_COLORS: Record<string, string> = {
  on_track: '#10B981', warning: '#EAB308', at_risk: '#EF4444',
  overdue: '#3B82F6', on_hold: '#94A3B8', completed: '#7C3AED',
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
const fmtN = (n: number) =>
  new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 1 }).format(n);
const trunc = (s: string, n: number) =>
  s && s.length > n ? s.slice(0, n - 1) + '…' : s;
const fmtK = (v: number) => v >= 1000 ? `R${(v / 1000).toFixed(0)}k` : `R${Math.round(v)}`;
const fmtHrs = (v: number) => `${Math.round(v)}h`;

const RADIAN = Math.PI / 180;
const renderPieLabel = ({ cx, cy, midAngle, outerRadius, percent, count }: any) => {
  if (percent < 0.04) return null;
  const r = outerRadius + 20;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill='#475569' textAnchor={x > cx ? 'start' : 'end'} dominantBaseline='central' fontSize={8} fontWeight={600}>
      {`${count} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

const renderPrintLegend = (props: any) => {
  const items: any[] = props.payload || [];
  if (items.length === 0) return null;
  const CHAR_W = 5.5, DOT = 8, GAP = 3, ITEM_GAP = 8, H = 10;
  const labels = items.map((e: any) =>
    e.payload?.count != null ? `${e.value} (${e.payload.count})` : e.value
  );
  const itemWidths = labels.map((l: string) => DOT + GAP + l.length * CHAR_W);
  const positions = itemWidths.map((_: number, i: number) =>
    itemWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0) + i * ITEM_GAP
  );
  const totalW = positions[positions.length - 1] + itemWidths[itemWidths.length - 1];
  return (
    <div style={{ width: '100%', textAlign: 'center', paddingTop: 4 }}>
      <svg width={totalW} height={H} style={{ display: 'inline-block', overflow: 'visible' }}>
        {items.map((entry: any, i: number) => (
          <g key={i} transform={`translate(${positions[i]}, 0)`}>
            <rect x="0" y="1" width={DOT} height={DOT} rx="2" ry="2" fill={entry.color} />
            <text x={DOT + GAP} y={H / 2} dominantBaseline="middle" fontSize="8" fontWeight="600" fill="#475569">{labels[i]}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const CHART_H = 275;

const PAGE_STYLE: React.CSSProperties = {
  width: 794, height: 1123, padding: 28, boxSizing: 'border-box',
  background: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif',
  overflow: 'hidden',
};
const cardStyle: React.CSSProperties = {
  background: '#f8fafc', borderRadius: 8,
  padding: '10px 12px', border: '1px solid #e2e8f0',
  marginBottom: 12,
};
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#475569', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.05em',
  display: 'flex', alignItems: 'center', gap: 4,
};
const lblStyle = { fontSize: 6, fill: '#64748b', fontWeight: 600 } as const;

const makeVerticalLabel = (fmt: (v: number) => string) =>
  ({ x, y, width, value }: any) => {
    if (value == null || value === 0) return null;
    const cx = x + width / 2;
    const top = y - 3;
    return (
      <text x={cx} y={top} textAnchor='start' dominantBaseline='middle'
        transform={`rotate(-90, ${cx}, ${top})`}
        fontSize={6} fontWeight={600} fill='#64748b'>{fmt(Number(value))}</text>
    );
  };

const makeStaggerLabel = (fmt: (v: number) => string) =>
  ({ x, y, width, value, index }: any) => {
    if (value == null || value === 0) return null;
    const cx = x + width / 2;
    const textY = y - (index % 2 === 0 ? 10 : 26);
    return (
      <g>
        <line x1={cx} y1={textY + 2} x2={cx} y2={y - 2}
          stroke='#cbd5e1' strokeWidth={0.8} strokeDasharray='2,2' />
        <text x={cx} y={textY} textAnchor='middle' dominantBaseline='auto'
          fontSize={6} fontWeight={600} fill='#64748b'>{fmt(Number(value))}</text>
      </g>
    );
  };

const MAX_AT_RISK_CARDS = 50;

type PrintViewProps = { filteredData: UIProjectRow[] };

const PrintView = React.forwardRef<HTMLDivElement, PrintViewProps>(({ filteredData }, ref) => {
  const metrics = useMemo(() => {
    const totalSales = filteredData.reduce((s, r) => s + (r[UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT] || 0), 0);
    const totalCost = filteredData.reduce((s, r) => s + (r[UI_PROJECT_KEYS.TOTAL_COSTING] || 0), 0);
    const totalBudget = filteredData.reduce((s, r) => s + (r[UI_PROJECT_KEYS.BUDGET_HOURS] || 0), 0);
    const totalConsumed = filteredData.reduce((s, r) => s + (r[UI_PROJECT_KEYS.CONSUMED_TIME] || 0), 0);
    const margin = totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0;
    return { count: filteredData.length, totalSales, totalCost, margin, totalBudget, totalConsumed };
  }, [filteredData]);

  const salesCostData = useMemo(() =>
    filteredData
      .map(d => ({ name: trunc(d.Project || 'Unknown', 16), Sales: d[UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT] || 0, Cost: d[UI_PROJECT_KEYS.TOTAL_COSTING] || 0 }))
      .sort((a, b) => b.Sales - a.Sales)
      .slice(0, 15),
  [filteredData]);

  const hoursData = useMemo(() =>
    filteredData
      .map(d => ({
        name: trunc(d.Project || 'Unknown', 16),
        'Budget (hrs)': d[UI_PROJECT_KEYS.BUDGET_HOURS] || 0,
        'Consumed (hrs)': d[UI_PROJECT_KEYS.CONSUMED_TIME] || 0,
        'Progress (%)': Number(d[UI_PROJECT_KEYS.ACTUAL_PROGRESS] || 0) * 100,
      }))
      .sort((a, b) => b['Budget (hrs)'] - a['Budget (hrs)'])
      .slice(0, 15),
  [filteredData]);

  const statusData = useMemo(() => {
    const groups: Record<string, { key: string; label: string; count: number }> = {};
    filteredData.forEach(d => {
      const key = d._statusKey || 'on_track';
      if (!groups[key]) groups[key] = { key, label: d.Status || key, count: 0 };
      groups[key].count++;
    });
    return Object.values(groups);
  }, [filteredData]);

  const revenueByPM = useMemo(() => {
    const groups: Record<string, number> = {};
    filteredData.forEach(d => {
      const pm = formatManagerName(d[UI_PROJECT_KEYS.PROJECT_MANAGER]) || 'Unassigned';
      groups[pm] = (groups[pm] || 0) + (d[UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT] || 0);
    });
    return Object.entries(groups)
      .map(([name, value]) => ({ name: trunc(name, 14), value }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [filteredData]);

  const workloadData = useMemo(() => {
    const groups: Record<string, { name: string; projects: number; hours: number }> = {};
    filteredData.forEach(d => {
      const pm = formatManagerName(d[UI_PROJECT_KEYS.PROJECT_MANAGER]) || 'Unassigned';
      if (!groups[pm]) groups[pm] = { name: trunc(pm, 14), projects: 0, hours: 0 };
      groups[pm].projects++;
      groups[pm].hours += d[UI_PROJECT_KEYS.BUDGET_HOURS] || 0;
    });
    return Object.values(groups).sort((a, b) => b.projects - a.projects).slice(0, 15);
  }, [filteredData]);

  const billableData = useMemo(() =>
    filteredData
      .map(d => {
        let consumed = 0, billable = 0;
        if (d.SubTasks?.length) {
          d.SubTasks.forEach(t => { consumed += t.consumedTime || 0; billable += t.billableHours || 0; });
        } else {
          consumed = d[UI_PROJECT_KEYS.CONSUMED_TIME] || 0;
          billable = Math.floor(consumed * 0.8);
        }
        return { name: trunc(d.Project || 'Unknown', 16), billable, nonBillable: Math.max(0, consumed - billable), total: consumed };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 15),
  [filteredData]);

  const atRiskProjects = useMemo(() =>
    filteredData.filter(d => AT_RISK_STATUS_KEYS.has(d._statusKey || '')),
  [filteredData]);

  const ROWS_P1 = 30;
  const ROWS_P2 = 35;
  const tableRowsP1 = filteredData.slice(0, ROWS_P1);
  const tableRowsP2 = filteredData.slice(ROWS_P1, ROWS_P1 + ROWS_P2);
  const overflowCount = Math.max(0, filteredData.length - ROWS_P1 - ROWS_P2);
  const hasPage2 = filteredData.length > ROWS_P1;

  const tableHead = (
    <thead>
      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
        {['Project', 'Project Manager', 'Status', 'Due Date', 'Budget (h)', 'Consumed (h)', 'Sales', 'Cost', 'Margin'].map(h => (
          <th key={h} style={{ padding: '6px 8px', textAlign: ['Project', 'Project Manager', 'Status'].includes(h) ? 'left' : 'right', fontWeight: 700, color: '#475569', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
        ))}
      </tr>
    </thead>
  );

  const renderRow = (d: UIProjectRow, i: number) => {
    const sales = d[UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT] || 0;
    const cost  = d[UI_PROJECT_KEYS.TOTAL_COSTING] || 0;
    const margin = sales > 0 ? ((sales - cost) / sales) * 100 : 0;
    const statusColor = STATUS_COLORS[d._statusKey || 'on_track'] || '#94a3b8';
    return (
      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
        <td style={{ padding: '5px 8px', fontWeight: 600, color: '#1e293b', maxWidth: 160, verticalAlign: 'middle' }}>{trunc(d.Project || '—', 28)}</td>
        <td style={{ padding: '5px 8px', color: '#475569', verticalAlign: 'middle' }}>{trunc(formatManagerName(d[UI_PROJECT_KEYS.PROJECT_MANAGER]) || '—', 18)}</td>
        <td style={{ padding: '5px 8px', verticalAlign: 'middle' }}>
          <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 4, color: statusColor, fontWeight: 700, fontSize: 8 }}>{d.Status || '—'}</span>
        </td>
        <td style={{ padding: '5px 8px', textAlign: 'right', color: '#475569', verticalAlign: 'middle' }}>{d[UI_PROJECT_KEYS.DUE_DATE] || '—'}</td>
        <td style={{ padding: '5px 8px', textAlign: 'right', color: '#475569', verticalAlign: 'middle' }}>{fmtN(d[UI_PROJECT_KEYS.BUDGET_HOURS] || 0)}</td>
        <td style={{ padding: '5px 8px', textAlign: 'right', color: '#475569', verticalAlign: 'middle' }}>{fmtN(d[UI_PROJECT_KEYS.CONSUMED_TIME] || 0)}</td>
        <td style={{ padding: '5px 8px', textAlign: 'right', color: '#059669', fontWeight: 600, verticalAlign: 'middle' }}>{fmtCurrency(sales)}</td>
        <td style={{ padding: '5px 8px', textAlign: 'right', color: '#e11d48', fontWeight: 600, verticalAlign: 'middle' }}>{fmtCurrency(cost)}</td>
        <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: margin >= 0 ? '#059669' : '#e11d48', verticalAlign: 'middle' }}>{fmtN(margin)}%</td>
      </tr>
    );
  };


  const PageHeader = ({ subtitle }: { subtitle: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '2px solid #e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src='/static/kartoza-logo.png' alt='Kartoza' style={{ height: 28 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>PMO Executive Dashboard</div>
          <div style={{ fontSize: 10, color: '#64748b' }}>{subtitle}</div>
        </div>
      </div>
      <div style={{ fontSize: 10, color: '#94a3b8' }}>
        {new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
      </div>
    </div>
  );

  const footer = (
    <div style={{ position: 'absolute', bottom: 28, left: 28, right: 28, borderTop: '1px solid #e2e8f0', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#94a3b8' }}>
      <span>Kartoza PMO Dashboard</span>
      <span>{new Date().getFullYear()}</span>
    </div>
  );

  return (
    <div ref={ref} style={{ position: 'absolute', left: -9999, top: 0 }}>

      {/* ── Page 1: Overview + Project List ── */}
      <div data-print-page='1' style={PAGE_STYLE}>
        <PageHeader subtitle={`${filteredData.length} projects · Executive Overview`} />

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {([
            { label: '# Projects',       value: String(metrics.count),                                            color: '#6366f1' },
            { label: 'Total Sales',       value: fmtCurrency(metrics.totalSales),                                  color: '#10b981' },
            { label: 'Total Cost',        value: fmtCurrency(metrics.totalCost),                                   color: '#f43f5e' },
            { label: 'Profit Margin',     value: `${fmtN(metrics.margin)}%`,                                      color: '#8b5cf6' },
            { label: 'Budget/Consumed',   value: `${fmtN(metrics.totalBudget)}h / ${fmtN(metrics.totalConsumed)}h`, color: '#f59e0b' },
          ] as { label: string; value: string; color: string }[]).map(m => (
            <div key={m.label} style={{ flex: 1, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', borderLeft: `4px solid ${m.color}` }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>{m.value}</div>
            </div>
          ))}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
          {tableHead}
          <tbody>{tableRowsP1.map(renderRow)}</tbody>
        </table>

        {!hasPage2 && overflowCount > 0 && (
          <div style={{ marginTop: 8, fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>
            … and {overflowCount} more project{overflowCount > 1 ? 's' : ''} not shown
          </div>
        )}
        {footer}
      </div>

      {/* ── Page 2: Project List continued (conditional) ── */}
      {hasPage2 && (
        <div data-print-page='2' style={PAGE_STYLE}>
          <PageHeader subtitle={`Project list continued · ${filteredData.length} projects total`} />

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
            {tableHead}
            <tbody>{tableRowsP2.map(renderRow)}</tbody>
          </table>

          {overflowCount > 0 && (
            <div style={{ marginTop: 8, fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>
              … and {overflowCount} more project{overflowCount > 1 ? 's' : ''} not shown
            </div>
          )}
          {footer}
        </div>
      )}

      {/* ── Page 3: Charts 1 ── */}
      <div data-print-page='3' style={PAGE_STYLE}>
        <PageHeader subtitle='Charts · Portfolio Status & Financial Performance' />

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Portfolio Status Distribution</div>
          <div style={{ height: CHART_H }}>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={statusData} dataKey='count' nameKey='label'
                  cx='50%' cy='44%' innerRadius={52} outerRadius={92}
                  paddingAngle={2}
                  label={renderPieLabel}
                  labelLine={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                >
                  {statusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.key] || '#94a3b8'} />)}
                </Pie>
                <Legend content={renderPrintLegend} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Sales vs. Cost <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9 }}>(top 15 by sales)</span></div>
          <div style={{ height: CHART_H }}>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={salesCostData} margin={{ top: 34, right: 4, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
                <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 7 }} interval={0} angle={-35} textAnchor='end' height={56} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 7 }} tickFormatter={v => fmtK(Number(v))} width={40} />
                <Bar dataKey='Sales' fill='#818cf8' radius={[2, 2, 0, 0]} maxBarSize={20}>
                  <LabelList dataKey='Sales' content={makeVerticalLabel(fmtK)} />
                </Bar>
                <Bar dataKey='Cost' fill='#fb7185' radius={[2, 2, 0, 0]} maxBarSize={20}>
                  <LabelList dataKey='Cost' content={makeVerticalLabel(fmtK)} />
                </Bar>
                <Legend content={renderPrintLegend} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Revenue by Project Manager <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9 }}>(top 15 by revenue)</span></div>
          <div style={{ height: CHART_H }}>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={revenueByPM} layout='vertical' margin={{ top: 4, right: 60, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray='3 3' horizontal={false} stroke='#e2e8f0' />
                <XAxis type='number' tick={{ fill: '#94a3b8', fontSize: 7 }} tickFormatter={v => fmtK(Number(v))} />
                <YAxis type='category' dataKey='name' tick={{ fill: '#64748b', fontSize: 8 }} width={85} interval={0} />
                <Bar dataKey='value' name='Revenue' fill='#6366f1' radius={[0, 2, 2, 0]} maxBarSize={16}>
                  <LabelList dataKey='value' position='right' formatter={(v: any) => fmtK(Number(v))} style={{ ...lblStyle, fontSize: 7 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {footer}
      </div>

      {/* ── Page 4: Resource & Efficiency Charts ── */}
      <div data-print-page='4' style={PAGE_STYLE}>
        <PageHeader subtitle='Resource Utilisation & Efficiency' />

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Time Budget Consumption <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9 }}>(all projects, sorted by budget)</span></div>
          <div style={{ height: CHART_H }}>
            <ResponsiveContainer width='100%' height='100%'>
              <ComposedChart data={hoursData} margin={{ top: 16, right: 32, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
                <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 7 }} interval={0} angle={-35} textAnchor='end' height={56} />
                <YAxis yAxisId='left' tick={{ fill: '#94a3b8', fontSize: 7 }} width={32} />
                <YAxis yAxisId='right' orientation='right' tick={{ fill: '#14B8A6', fontSize: 7 }} tickFormatter={v => `${v}%`} width={28} />
                <Bar yAxisId='left' dataKey='Budget (hrs)' fill='#94a3b8' radius={[2, 2, 0, 0]} maxBarSize={16}>
                  <LabelList dataKey='Budget (hrs)' position='top' formatter={(v: any) => fmtHrs(Number(v))} style={lblStyle} />
                </Bar>
                <Bar yAxisId='left' dataKey='Consumed (hrs)' fill='#f59e0b' radius={[2, 2, 0, 0]} maxBarSize={16}>
                  <LabelList dataKey='Consumed (hrs)' position='top' formatter={(v: any) => fmtHrs(Number(v))} style={lblStyle} />
                </Bar>
                <Line yAxisId='right' type='monotone' dataKey='Progress (%)' stroke='#14B8A6' strokeWidth={2} dot={{ r: 2, fill: '#fff', strokeWidth: 2 }}>
                  <LabelList dataKey='Progress (%)' position='top' formatter={(v: any) => `${Math.round(v)}%`} style={{ ...lblStyle, fill: '#14B8A6' }} />
                </Line>
                <Legend content={renderPrintLegend} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>PM Workload Distribution <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9 }}>(top 15 by project count)</span></div>
          <div style={{ height: CHART_H }}>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={workloadData} margin={{ top: 16, right: 36, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
                <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 7 }} interval={0} angle={-20} textAnchor='end' height={38} />
                <YAxis yAxisId='l' tick={{ fill: '#94a3b8', fontSize: 7 }} allowDecimals={false} width={22} />
                <YAxis yAxisId='r' orientation='right' tick={{ fill: '#94a3b8', fontSize: 7 }} width={32} />
                <Bar yAxisId='l' dataKey='projects' name='Projects' fill='#6366f1' radius={[2, 2, 0, 0]} maxBarSize={20}>
                  <LabelList dataKey='projects' position='top' style={lblStyle} />
                </Bar>
                <Bar yAxisId='r' dataKey='hours' name='Budget Hrs' fill='#f59e0b' radius={[2, 2, 0, 0]} maxBarSize={20}>
                  <LabelList dataKey='hours' position='top' formatter={(v: any) => fmtHrs(Number(v))} style={lblStyle} />
                </Bar>
                <Legend content={renderPrintLegend} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Billable Efficiency <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9 }}>(top 15 by consumed hours)</span></div>
          <div style={{ height: CHART_H }}>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={billableData} margin={{ top: 34, right: 4, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
                <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 7 }} interval={0} angle={-35} textAnchor='end' height={56} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 7 }} width={32} />
                <Bar dataKey='billable' name='Billable' stackId='a' fill='#10b981' maxBarSize={20} />
                <Bar dataKey='nonBillable' name='Non-Billable' stackId='a' fill='#f43f5e' radius={[2, 2, 0, 0]} maxBarSize={20}>
                  <LabelList dataKey='total' content={makeStaggerLabel(fmtHrs)} />
                </Bar>
                <Legend content={renderPrintLegend} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {footer}
      </div>

      {/* ── Page 5: At Risk / Action Items ── */}
      <div data-print-page='5' style={PAGE_STYLE}>
        <PageHeader subtitle={`Action Items · ${atRiskProjects.length} project${atRiskProjects.length !== 1 ? 's' : ''} requiring attention`} />

        {atRiskProjects.length === 0 ? (
          <div style={{ marginTop: 40, textAlign: 'center', color: '#10b981', fontSize: 13, fontWeight: 700 }}>
            ✓ No projects currently require immediate attention.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                {['Project', 'Project Manager', 'Due Date', 'Reason'].map(h => (
                  <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {atRiskProjects.slice(0, MAX_AT_RISK_CARDS).map((proj, i) => {
                const statusColor = STATUS_COLORS[proj._statusKey || 'at_risk'] || '#ef4444';
                const pmName = formatManagerName(proj[UI_PROJECT_KEYS.PROJECT_MANAGER]) || '—';
                const reasons = (proj._statusReasons || [proj.Status || 'At risk']).join(' · ');
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', borderLeft: `3px solid ${statusColor}`, background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 600, color: '#1e293b', verticalAlign: 'middle' }}>{trunc(proj.Project || '—', 36)}</td>
                    <td style={{ padding: '6px 10px', color: '#475569', verticalAlign: 'middle' }}>{trunc(pmName, 20)}</td>
                    <td style={{ padding: '6px 10px', color: '#475569', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{proj[UI_PROJECT_KEYS.DUE_DATE] || '—'}</td>
                    <td style={{ padding: '6px 10px', color: statusColor, fontWeight: 600, verticalAlign: 'middle' }}>{trunc(reasons, 48)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {footer}
      </div>

    </div>
  );
});

PrintView.displayName = 'PrintView';
export default PrintView;
