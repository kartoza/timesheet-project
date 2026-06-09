import React, { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell,
  ComposedChart, Legend, Line,
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

const hexRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(n);
const fmtN = (n: number) =>
  new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 1 }).format(n);
const trunc = (s: string, n: number) =>
  s && s.length > n ? s.slice(0, n - 1) + '…' : s;

const CHART_H = 238;
const PAGE_STYLE: React.CSSProperties = {
  width: 794, height: 1123, padding: 28, boxSizing: 'border-box',
  background: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif',
  overflow: 'hidden',
};
const cardStyle: React.CSSProperties = {
  flex: 1, background: '#f8fafc', borderRadius: 8,
  padding: '10px 12px', border: '1px solid #e2e8f0',
};
const rowStyle: React.CSSProperties = { display: 'flex', gap: 12, marginBottom: 12 };
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#475569', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

const MAX_TABLE_ROWS = 40;
const MAX_AT_RISK_CARDS = 30;

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
      .sort((a, b) => b.Sales - a.Sales).slice(0, 10),
  [filteredData]);

  const hoursData = useMemo(() =>
    filteredData
      .map(d => ({
        name: trunc(d.Project || 'Unknown', 16),
        'Budget (hrs)': d[UI_PROJECT_KEYS.BUDGET_HOURS] || 0,
        'Consumed (hrs)': d[UI_PROJECT_KEYS.CONSUMED_TIME] || 0,
        'Progress (%)': Number(d[UI_PROJECT_KEYS.ACTUAL_PROGRESS] || 0) * 100,
      }))
      .sort((a, b) => b['Budget (hrs)'] - a['Budget (hrs)']).slice(0, 10),
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
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const workloadData = useMemo(() => {
    const groups: Record<string, { name: string; projects: number; hours: number }> = {};
    filteredData.forEach(d => {
      const pm = formatManagerName(d[UI_PROJECT_KEYS.PROJECT_MANAGER]) || 'Unassigned';
      if (!groups[pm]) groups[pm] = { name: trunc(pm, 14), projects: 0, hours: 0 };
      groups[pm].projects++;
      groups[pm].hours += d[UI_PROJECT_KEYS.BUDGET_HOURS] || 0;
    });
    return Object.values(groups).sort((a, b) => b.projects - a.projects);
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
      .sort((a, b) => b.total - a.total).slice(0, 10),
  [filteredData]);

  const atRiskProjects = useMemo(() =>
    filteredData.filter(d => AT_RISK_STATUS_KEYS.has(d._statusKey || '')),
  [filteredData]);

  const tableRows = filteredData.slice(0, MAX_TABLE_ROWS);
  const overflowCount = Math.max(0, filteredData.length - MAX_TABLE_ROWS);

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

      {/* ── Page 1: Action Items ── */}
      <div data-print-page='1' style={PAGE_STYLE}>
        <PageHeader subtitle={`Action Items · ${atRiskProjects.length} project${atRiskProjects.length !== 1 ? 's' : ''} requiring attention`} />

        {atRiskProjects.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: '#10b981', fontSize: 13, fontWeight: 700, gap: 8 }}>
            ✓ No projects currently require immediate attention.
          </div>
        ) : (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {atRiskProjects.slice(0, MAX_AT_RISK_CARDS).map((proj, i) => {
                const statusColor = STATUS_COLORS[proj._statusKey || 'at_risk'] || '#ef4444';
                const pmName = formatManagerName(proj[UI_PROJECT_KEYS.PROJECT_MANAGER]) || 'Unassigned';
                const pmInitials = pmName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={i} style={{ background: '#fff', border: `1px solid ${hexRgba(statusColor, 0.2)}`, borderLeft: `3px solid ${statusColor}`, borderRadius: 6, padding: '9px 11px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#1e293b', flex: 1, marginRight: 6, lineHeight: '14px' }}>
                        {trunc(proj.Project || '—', 26)}
                      </span>
                      <span style={{ flexShrink: 0, width: 20, height: 20, lineHeight: '20px', textAlign: 'center', fontSize: 7, fontWeight: 800, color: '#fff', background: '#64748b', borderRadius: '50%', display: 'inline-block' }}>
                        {pmInitials}
                      </span>
                    </div>
                    <div style={{ fontSize: 8, color: '#64748b', marginBottom: 4 }}>{trunc(pmName, 22)}</div>
                    <div style={{ marginBottom: 4 }}>
                      {(proj._statusReasons || [proj.Status || 'At risk']).slice(0, 3).map((reason: string, idx: number) => (
                        <span key={idx} style={{ display: 'inline-block', marginRight: 3, marginBottom: 2, fontSize: 7, fontWeight: 700, color: statusColor, background: hexRgba(statusColor, 0.1), padding: '2px 5px', borderRadius: 3 }}>
                          {reason}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 8, color: '#94a3b8' }}>
                      Due: <span style={{ fontWeight: 600, color: '#475569' }}>{proj[UI_PROJECT_KEYS.DUE_DATE] || 'N/A'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {atRiskProjects.length > MAX_AT_RISK_CARDS && (
              <div style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
                +{atRiskProjects.length - MAX_AT_RISK_CARDS} more projects not shown
              </div>
            )}
          </div>
        )}
        {footer}
      </div>

      {/* ── Page 2: Project List ── */}
      <div data-print-page='2' style={PAGE_STYLE}>
        <PageHeader subtitle={`${filteredData.length} projects · Full list`} />

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
              {['Project', 'Project Manager', 'Status', 'Due Date', 'Budget (h)', 'Consumed (h)', 'Sales', 'Cost', 'Margin'].map(h => (
                <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Project' || h === 'Project Manager' || h === 'Status' ? 'left' : 'right', fontWeight: 700, color: '#475569', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((d, i) => {
              const sales = d[UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT] || 0;
              const cost = d[UI_PROJECT_KEYS.TOTAL_COSTING] || 0;
              const margin = sales > 0 ? ((sales - cost) / sales) * 100 : 0;
              const statusKey = d._statusKey || 'on_track';
              const statusColor = STATUS_COLORS[statusKey] || '#94a3b8';
              return (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                  <td style={{ padding: '5px 8px', fontWeight: 600, color: '#1e293b', maxWidth: 160, verticalAlign: 'middle' }}>{trunc(d.Project || '—', 28)}</td>
                  <td style={{ padding: '5px 8px', color: '#475569', verticalAlign: 'middle' }}>{trunc(formatManagerName(d[UI_PROJECT_KEYS.PROJECT_MANAGER]) || '—', 18)}</td>
                  <td style={{ padding: '5px 8px', verticalAlign: 'middle' }}>
                    <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 4, background: hexRgba(statusColor, 0.13), color: statusColor, fontWeight: 700, fontSize: 8 }}>{d.Status || '—'}</span>
                  </td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: '#475569', verticalAlign: 'middle' }}>{d[UI_PROJECT_KEYS.DUE_DATE] || '—'}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: '#475569', verticalAlign: 'middle' }}>{fmtN(d[UI_PROJECT_KEYS.BUDGET_HOURS] || 0)}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: '#475569', verticalAlign: 'middle' }}>{fmtN(d[UI_PROJECT_KEYS.CONSUMED_TIME] || 0)}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: '#059669', fontWeight: 600, verticalAlign: 'middle' }}>{fmtCurrency(sales)}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', color: '#e11d48', fontWeight: 600, verticalAlign: 'middle' }}>{fmtCurrency(cost)}</td>
                  <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: margin >= 0 ? '#059669' : '#e11d48', verticalAlign: 'middle' }}>{fmtN(margin)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {overflowCount > 0 && (
          <div style={{ marginTop: 8, fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>
            … and {overflowCount} more project{overflowCount > 1 ? 's' : ''} not shown
          </div>
        )}
        {footer}
      </div>

      {/* ── Page 3: Charts ── */}
      <div data-print-page='3' style={PAGE_STYLE}>
        <PageHeader subtitle={`${filteredData.length} projects · Summary`} />

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {([
            { label: '# Projects', value: String(metrics.count), color: '#6366f1' },
            { label: 'Total Sales', value: fmtCurrency(metrics.totalSales), color: '#10b981' },
            { label: 'Total Cost', value: fmtCurrency(metrics.totalCost), color: '#f43f5e' },
            { label: 'Profit Margin', value: `${fmtN(metrics.margin)}%`, color: '#8b5cf6' },
            { label: 'Budget / Consumed', value: `${fmtN(metrics.totalBudget)}h / ${fmtN(metrics.totalConsumed)}h`, color: '#f59e0b' },
          ] as { label: string; value: string; color: string }[]).map(m => (
            <div key={m.label} style={{ flex: 1, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', borderLeft: `4px solid ${m.color}` }}>
              <div style={{ fontSize: 8, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>{m.value}</div>
            </div>
          ))}
        </div>

        <div style={rowStyle}>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>Sales vs. Cost <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9 }}>(top 10 by sales)</span></div>
            <div style={{ height: CHART_H }}>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={salesCostData} margin={{ top: 4, right: 4, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
                  <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 8 }} interval={0} angle={-35} textAnchor='end' height={52} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 8 }} tickFormatter={v => `R${(Number(v) / 1000).toFixed(0)}k`} width={42} />
                  <Bar dataKey='Sales' fill='#818cf8' radius={[3, 3, 0, 0]} maxBarSize={18} />
                  <Bar dataKey='Cost' fill='#fb7185' radius={[3, 3, 0, 0]} maxBarSize={18} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>Time Budget Consumption <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9 }}>(top 10 by budget)</span></div>
            <div style={{ height: CHART_H }}>
              <ResponsiveContainer width='100%' height='100%'>
                <ComposedChart data={hoursData} margin={{ top: 4, right: 28, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
                  <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 8 }} interval={0} angle={-35} textAnchor='end' height={52} />
                  <YAxis yAxisId='left' tick={{ fill: '#94a3b8', fontSize: 8 }} width={35} />
                  <YAxis yAxisId='right' orientation='right' tick={{ fill: '#14B8A6', fontSize: 8 }} tickFormatter={v => `${v}%`} width={28} />
                  <Bar yAxisId='left' dataKey='Budget (hrs)' fill='#94a3b8' radius={[3, 3, 0, 0]} maxBarSize={18} />
                  <Bar yAxisId='left' dataKey='Consumed (hrs)' fill='#f59e0b' radius={[3, 3, 0, 0]} maxBarSize={18} />
                  <Line yAxisId='right' type='monotone' dataKey='Progress (%)' stroke='#14B8A6' strokeWidth={2} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div style={rowStyle}>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>Portfolio Status Distribution</div>
            <div style={{ height: CHART_H }}>
              <ResponsiveContainer width='100%' height='100%'>
                <PieChart>
                  <Pie data={statusData} dataKey='count' nameKey='label' cx='50%' cy='48%' innerRadius={50} outerRadius={82} paddingAngle={2}>
                    {statusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.key] || '#94a3b8'} />)}
                  </Pie>
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>Revenue by Project Manager</div>
            <div style={{ height: CHART_H }}>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={revenueByPM} layout='vertical' margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray='3 3' horizontal={false} stroke='#e2e8f0' />
                  <XAxis type='number' tick={{ fill: '#94a3b8', fontSize: 8 }} tickFormatter={v => `R${(Number(v) / 1000).toFixed(0)}k`} />
                  <YAxis type='category' dataKey='name' tick={{ fill: '#64748b', fontSize: 8 }} width={68} />
                  <Bar dataKey='value' name='Revenue' fill='#6366f1' radius={[0, 3, 3, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div style={rowStyle}>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>PM Workload Distribution</div>
            <div style={{ height: CHART_H }}>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={workloadData} margin={{ top: 4, right: 4, left: 0, bottom: 34 }}>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
                  <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 8 }} interval={0} angle={-20} textAnchor='end' height={38} />
                  <YAxis yAxisId='l' tick={{ fill: '#94a3b8', fontSize: 8 }} allowDecimals={false} width={22} />
                  <YAxis yAxisId='r' orientation='right' tick={{ fill: '#94a3b8', fontSize: 8 }} width={32} />
                  <Bar yAxisId='l' dataKey='projects' name='Projects' fill='#6366f1' radius={[3, 3, 0, 0]} maxBarSize={18} />
                  <Bar yAxisId='r' dataKey='hours' name='Budget Hrs' fill='#f59e0b' radius={[3, 3, 0, 0]} maxBarSize={18} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div style={cardStyle}>
            <div style={sectionTitleStyle}>Billable Efficiency <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9 }}>(top 10 by consumed)</span></div>
            <div style={{ height: CHART_H }}>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={billableData} margin={{ top: 4, right: 4, left: 0, bottom: 48 }}>
                  <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
                  <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 8 }} interval={0} angle={-35} textAnchor='end' height={52} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 8 }} width={32} />
                  <Bar dataKey='billable' name='Billable' stackId='a' fill='#10b981' maxBarSize={18} />
                  <Bar dataKey='nonBillable' name='Non-Billable' stackId='a' fill='#f43f5e' radius={[3, 3, 0, 0]} maxBarSize={18} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#94a3b8' }}>
          <span>* Per-project charts show top 10 projects only</span>
          <span>Kartoza PMO Dashboard · {new Date().getFullYear()}</span>
        </div>
      </div>

    </div>
  );
});

PrintView.displayName = 'PrintView';
export default PrintView;
