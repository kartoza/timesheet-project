import React, { useMemo } from 'react';
import { ApiContractTracker, ContractStatus } from '../../types/pmo_dashboard';

const STATUS_COLORS: Record<ContractStatus, string> = {
  'Open': '#10B981',
  'Expires in 3 Months': '#3B82F6',
  'Expires in 2 Months': '#F59E0B',
  'Expires in 1 Month': '#EF4444',
  'Closed': '#94A3B8',
};

const trunc = (s: string, n: number) => s && s.length > n ? s.slice(0, n - 1) + '…' : s;

const PAGE_STYLE: React.CSSProperties = {
  width: 794, height: 1123, padding: 28, boxSizing: 'border-box',
  background: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif',
  overflow: 'hidden', position: 'relative',
};

const ROWS_PER_PAGE = 32;

type SupportPrintViewProps = { contracts: ApiContractTracker[] };

const SupportPrintView = React.forwardRef<HTMLDivElement, SupportPrintViewProps>(({ contracts }, ref) => {
  const pages = useMemo(() => {
    const chunks: ApiContractTracker[][] = [];
    for (let i = 0; i < contracts.length; i += ROWS_PER_PAGE) {
      chunks.push(contracts.slice(i, i + ROWS_PER_PAGE));
    }
    return chunks.length > 0 ? chunks : [[]];
  }, [contracts]);

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
    </div>
  );
});

SupportPrintView.displayName = 'SupportPrintView';

export default SupportPrintView;
