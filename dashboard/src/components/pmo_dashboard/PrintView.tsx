import React, { useMemo } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell,
  Legend, Pie, PieChart,
  ResponsiveContainer, XAxis, YAxis,
} from 'recharts';
import { UI_PROJECT_KEYS } from '../../constants/pmo_dashboard';
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

const CHART_H = 240;

const cardStyle: React.CSSProperties = {
  flex: 1, background: '#f8fafc', borderRadius: 8,
  padding: '10px 12px', border: '1px solid #e2e8f0',
};
const rowStyle: React.CSSProperties = { display: 'flex', gap: 12, marginBottom: 12 };
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#475569', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.05em',
};

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
      .map(d => ({ name: trunc(d.Project || 'Unknown', 16), Budget: d[UI_PROJECT_KEYS.BUDGET_HOURS] || 0, Consumed: d[UI_PROJECT_KEYS.CONSUMED_TIME] || 0 }))
      .sort((a, b) => b.Budget - a.Budget).slice(0, 10),
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

  return (
    <div
      ref={ref}
      style={{
        width: 794, height: 1123, padding: 28, boxSizing: 'border-box',
        background: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden', position: 'absolute', left: -9999, top: 0,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '2px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img
            src='/static/kartoza-logo.png' alt='Kartoza'
            style={{ height: 30 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#1e293b' }}>PMO Executive Dashboard</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>{filteredData.length} projects · Filtered view</div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right' }}>
          {new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* Metrics */}
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

      {/* Row 1: Sales vs Cost | Hours Consumption */}
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
          <div style={sectionTitleStyle}>Hours Consumption <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 9 }}>(top 10 by budget)</span></div>
          <div style={{ height: CHART_H }}>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={hoursData} margin={{ top: 4, right: 4, left: 0, bottom: 48 }}>
                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
                <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 8 }} interval={0} angle={-35} textAnchor='end' height={52} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 8 }} width={35} />
                <Bar dataKey='Budget' fill='#94a3b8' radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar dataKey='Consumed' fill='#f59e0b' radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Status | Revenue by PM */}
      <div style={rowStyle}>
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>Portfolio Status Distribution</div>
          <div style={{ height: CHART_H }}>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie data={statusData} dataKey='count' nameKey='label' cx='50%' cy='48%' innerRadius={50} outerRadius={82} paddingAngle={2}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={STATUS_COLORS[entry.key] || '#94a3b8'} />
                  ))}
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

      {/* Row 3: PM Workload | Billable Efficiency */}
      <div style={rowStyle}>
        <div style={cardStyle}>
          <div style={sectionTitleStyle}>PM Workload Distribution</div>
          <div style={{ height: CHART_H }}>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={workloadData} margin={{ top: 4, right: 4, left: 0, bottom: 36 }}>
                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' />
                <XAxis dataKey='name' tick={{ fill: '#64748b', fontSize: 8 }} interval={0} angle={-20} textAnchor='end' height={40} />
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

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 7, display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#94a3b8' }}>
        <span>* Per-project charts show top 10 projects only</span>
        <span>Kartoza PMO Dashboard · {new Date().getFullYear()}</span>
      </div>
    </div>
  );
});

PrintView.displayName = 'PrintView';
export default PrintView;
