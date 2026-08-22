import React, { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { ApiContractTracker, ContractStatus, IssueSummaryResponse, IssueSummaryRow } from '../../types/pmo_dashboard';

const STATUS_COLORS: Record<ContractStatus, string> = {
  'Open': '#10B981',
  'Expires in 3 Months': '#3B82F6',
  'Expires in 2 Months': '#F59E0B',
  'Expires in 1 Month': '#EF4444',
  'Closed': '#94A3B8',
};

// Same colors/order as IssuePriorityChart (dataviz skill palette.md, slots 1-5 + 7).
const ISSUE_SERIES = [
  { key: 'total', label: 'Total', color: '#2a78d6' },
  { key: 'low', label: 'Low', color: '#008300' },
  { key: 'medium', label: 'Medium', color: '#e87ba4' },
  { key: 'high', label: 'High', color: '#eda100' },
  { key: 'resolved', label: 'Resolved', color: '#4a3aa7' },
  { key: 'closed', label: 'Closed', color: '#1baf7a' },
] as const;

const trunc = (s: string, n: number) => s && s.length > n ? s.slice(0, n - 1) + '…' : s;

const PAGE_STYLE: React.CSSProperties = {
  width: 794, height: 1123, padding: 28, boxSizing: 'border-box',
  background: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif',
  overflow: 'hidden', position: 'relative',
};
const cardStyle: React.CSSProperties = {
  background: '#f8fafc', borderRadius: 8,
  padding: '10px 12px', border: '1px solid #e2e8f0',
  marginBottom: 12,
};
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: '#475569', marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: '0.05em',
};
const CHART_H = 260;

// SVG-based legend: html2canvas can't reliably rasterize recharts' default
// flex-based <Legend>, so render it as text/rect nodes with dominantBaseline instead.
const renderPrintLegend = (props: any) => {
  const items: any[] = props.payload || [];
  if (items.length === 0) return null;
  const CHAR_W = 5.5, DOT = 8, GAP = 3, ITEM_GAP = 10, H = 10;
  const itemWidths = items.map((e: any) => DOT + GAP + String(e.value).length * CHAR_W);
  const positions = itemWidths.map((_: number, i: number) =>
    itemWidths.slice(0, i).reduce((a: number, b: number) => a + b, 0) + i * ITEM_GAP
  );
  const totalW = positions[positions.length - 1] + itemWidths[itemWidths.length - 1];
  return (
    <div style={{ width: '100%', textAlign: 'center', paddingTop: 4 }}>
      <svg width={totalW} height={H} style={{ display: 'inline-block', overflow: 'visible' }}>
        {items.map((entry: any, i: number) => (
          <g key={i} transform={`translate(${positions[i]}, 0)`}>
            <rect x='0' y='1' width={DOT} height={DOT} rx='2' ry='2' fill={entry.color} />
            <text x={DOT + GAP} y={H / 2} dominantBaseline='middle' fontSize='8' fontWeight='600' fill='#475569'>{entry.value}</text>
          </g>
        ))}
      </svg>
    </div>
  );
};

const issueTableHead = (
  <thead>
    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
      {['Project', 'Tickets Total', 'Low', 'Medium', 'High', 'Resolved', 'Closed'].map((h) => (
        <th key={h} style={{ padding: '6px 8px', textAlign: h === 'Project' ? 'left' : 'right', fontWeight: 700, color: '#475569', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
      ))}
    </tr>
  </thead>
);

const renderIssueRow = (row: IssueSummaryRow, i: number) => (
  <tr key={row.customer} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
    <td style={{ padding: '5px 8px', fontWeight: 600, color: '#1e293b', verticalAlign: 'middle' }}>{trunc(row.customer, 30)}</td>
    <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 700, color: '#1e293b', verticalAlign: 'middle' }}>{row.total}</td>
    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#475569', verticalAlign: 'middle' }}>{row.low}</td>
    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#475569', verticalAlign: 'middle' }}>{row.medium}</td>
    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#475569', verticalAlign: 'middle' }}>{row.high}</td>
    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#475569', verticalAlign: 'middle' }}>{row.resolved}</td>
    <td style={{ padding: '5px 8px', textAlign: 'right', color: '#475569', verticalAlign: 'middle' }}>{row.closed}</td>
  </tr>
);

const ROWS_PER_PAGE = 32;
const ISSUE_ROWS_PER_PAGE = 34;

const paginate = <T,>(rows: T[], perPage: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += perPage) {
    chunks.push(rows.slice(i, i + perPage));
  }
  return chunks.length > 0 ? chunks : [[]];
};

type SupportPrintViewProps = { contracts: ApiContractTracker[]; issueSummary: IssueSummaryResponse };

const SupportPrintView = React.forwardRef<HTMLDivElement, SupportPrintViewProps>(({ contracts, issueSummary }, ref) => {
  const pages = useMemo(() => paginate(contracts, ROWS_PER_PAGE), [contracts]);
  const allTimePages = useMemo(() => paginate(issueSummary.all_time, ISSUE_ROWS_PER_PAGE), [issueSummary.all_time]);
  const lastSprintPages = useMemo(() => paginate(issueSummary.last_sprint, ISSUE_ROWS_PER_PAGE), [issueSummary.last_sprint]);

  const PageHeader = ({ subtitle }: { subtitle: string }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottom: '2px solid #e2e8f0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src='/static/kartoza-logo.png' alt='Kartoza' style={{ height: 28 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1e293b' }}>PMO Support Dashboard</div>
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

  const tableHead = (
    <thead>
      <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
        {['Client', 'Project', 'Contract Type', 'Start Date', 'End Date', 'Contact', 'Status'].map((h) => (
          <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
        ))}
      </tr>
    </thead>
  );

  const renderRow = (row: ApiContractTracker, i: number) => (
    <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
      <td style={{ padding: '5px 8px', fontWeight: 600, color: '#1e293b', verticalAlign: 'middle' }}>{trunc(row.client || '—', 24)}</td>
      <td style={{ padding: '5px 8px', color: '#475569', verticalAlign: 'middle' }}>{trunc(row.project, 28)}</td>
      <td style={{ padding: '5px 8px', color: '#475569', verticalAlign: 'middle' }}>{trunc(row.contract_type || '—', 20)}</td>
      <td style={{ padding: '5px 8px', color: '#475569', verticalAlign: 'middle' }}>{row.start_date || '—'}</td>
      <td style={{ padding: '5px 8px', color: '#475569', verticalAlign: 'middle' }}>{row.end_date || '—'}</td>
      <td style={{ padding: '5px 8px', color: '#475569', verticalAlign: 'middle' }}>{trunc(row.contact || '—', 22)}</td>
      <td style={{ padding: '5px 8px', verticalAlign: 'middle' }}>
        <span style={{ display: 'inline-block', padding: '2px 6px', borderRadius: 4, color: STATUS_COLORS[row.status] || '#94a3b8', fontWeight: 700, fontSize: 8 }}>{row.status}</span>
      </td>
    </tr>
  );

  const renderIssueChart = (data: IssueSummaryRow[], title: string) => (
    <div style={cardStyle}>
      <div style={sectionTitleStyle}>{title}</div>
      <div style={{ height: CHART_H }}>
        {data.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: 10 }}>
            No support ticket data.
          </div>
        ) : (
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 30 }} barGap={2}>
              <CartesianGrid strokeDasharray='3 3' stroke='#e2e8f0' vertical={false} />
              <XAxis
                dataKey='customer'
                tickFormatter={(value: string) => trunc(value, 14)}
                tick={{ fontSize: 7, fill: '#64748b' }}
                interval={0}
                angle={-30}
                textAnchor='end'
                height={50}
              />
              <YAxis allowDecimals={false} domain={[0, 'dataMax']} tick={{ fontSize: 7, fill: '#94a3b8' }} width={24} />
              <Legend content={renderPrintLegend} />
              {ISSUE_SERIES.map((s) => (
                <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} maxBarSize={14} radius={[2, 2, 0, 0]} isAnimationActive={false}>
                  <LabelList dataKey={s.key} position='top' style={{ fontSize: 7, fontWeight: 700, fill: '#475569' }} />
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );

  return (
    <div ref={ref} style={{ position: 'absolute', left: -9999, top: 0 }}>
      {pages.map((rows, pageIndex) => (
        <div key={pageIndex} data-print-page={pageIndex + 1} style={PAGE_STYLE}>
          <PageHeader subtitle={`${contracts.length} contract${contracts.length === 1 ? '' : 's'} · Page ${pageIndex + 1} of ${pages.length}`} />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
            {tableHead}
            <tbody>{rows.map(renderRow)}</tbody>
          </table>
          {footer}
        </div>
      ))}

      <div data-print-page='issues-charts' style={PAGE_STYLE}>
        <PageHeader subtitle='Support Tickets · Charts' />
        {renderIssueChart(issueSummary.all_time, 'Support Tickets (All Time)')}
        {renderIssueChart(issueSummary.last_sprint, 'Tickets Current Sprint')}
        {footer}
      </div>

      {issueSummary.all_time.length > 0 && allTimePages.map((rows, pageIndex) => (
        <div key={`at-${pageIndex}`} data-print-page={`issues-alltime-${pageIndex + 1}`} style={PAGE_STYLE}>
          <PageHeader subtitle={`Support Tickets (All Time) · ${issueSummary.all_time.length} project${issueSummary.all_time.length === 1 ? '' : 's'} · Page ${pageIndex + 1} of ${allTimePages.length}`} />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
            {issueTableHead}
            <tbody>{rows.map(renderIssueRow)}</tbody>
          </table>
          {footer}
        </div>
      ))}

      {issueSummary.last_sprint.length > 0 && lastSprintPages.map((rows, pageIndex) => (
        <div key={`ls-${pageIndex}`} data-print-page={`issues-lastsprint-${pageIndex + 1}`} style={PAGE_STYLE}>
          <PageHeader subtitle={`Tickets Current Sprint · ${issueSummary.last_sprint.length} project${issueSummary.last_sprint.length === 1 ? '' : 's'} · Page ${pageIndex + 1} of ${lastSprintPages.length}`} />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
            {issueTableHead}
            <tbody>{rows.map(renderIssueRow)}</tbody>
          </table>
          {footer}
        </div>
      ))}
    </div>
  );
});

SupportPrintView.displayName = 'SupportPrintView';

export default SupportPrintView;
