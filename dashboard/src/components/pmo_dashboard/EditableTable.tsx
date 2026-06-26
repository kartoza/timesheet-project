import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown, TableProperties } from 'lucide-react';
import { STATUS_KEY_BADGE, UI_PROJECT_KEYS } from '../../constants/pmo_dashboard';
import { UIProjectRow } from '../../types/pmo_dashboard';
import { formatManagerName } from '../../utils/pmo_dashboard';

type EditableTableProps = {
  data: UIProjectRow[];
  onUpdateDataRow: (id: string, field: string, value: string | number) => Promise<void>;
  onDeleteDataRow: (id: string) => Promise<void>;
  onAddProject: () => void;
  onViewDetails: (project: UIProjectRow) => void;
};

type SortKey =
  | 'project'
  | 'manager'
  | 'dueDate'
  | 'status'
  | 'budget'
  | 'consumed'
  | 'sales'
  | 'cost'
  | 'progress';

type SortDir = 'asc' | 'desc';

const EditableTable: React.FC<EditableTableProps> = ({ data, onViewDetails }) => {
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(val || 0);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const getSortValue = (row: UIProjectRow, key: SortKey): string | number => {
    switch (key) {
      case 'project': return row.Project?.toLowerCase() ?? '';
      case 'manager': return (row[UI_PROJECT_KEYS.PROJECT_MANAGER] ?? '').toLowerCase();
      case 'dueDate': return row[UI_PROJECT_KEYS.DUE_DATE] ?? '';
      case 'status': return row._statusKey ?? '';
      case 'budget': return row[UI_PROJECT_KEYS.BUDGET_HOURS] ?? 0;
      case 'consumed': return row[UI_PROJECT_KEYS.CONSUMED_TIME] ?? 0;
      case 'sales': return row[UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT] ?? 0;
      case 'cost': return row[UI_PROJECT_KEYS.TOTAL_COSTING] ?? 0;
      case 'progress': return row[UI_PROJECT_KEYS.ACTUAL_PROGRESS] ?? 0;
    }
  };

  const sorted = [...data].sort((a, b) => {
    const av = getSortValue(a, sortKey);
    const bv = getSortValue(b, sortKey);
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown size={12} className='opacity-40' />;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const Th = ({ col, label, className = '' }: { col: SortKey; label: string; className?: string }) => (
    <th
      className={`px-4 py-3 cursor-pointer select-none hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors ${className}`}
      onClick={() => handleSort(col)}
    >
      <span className='inline-flex items-center gap-1'>
        {label}
        <SortIcon col={col} />
      </span>
    </th>
  );

  return (
    <div className='glass-card mb-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none rounded-2xl flex flex-col overflow-hidden'>
      <div className='p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50'>
        <h3 className='text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2'>
          <TableProperties size={18} className='text-indigo-600' /> Kartoza Running Projects
        </h3>
        <p className='text-sm font-medium text-slate-500 dark:text-slate-400'>Live-syncs with Dashboard</p>
      </div>

      <div className='w-full max-h-[65vh] overflow-y-auto pb-2 relative print:max-h-none print:overflow-visible print:border-none'>
        <table className='w-full text-left border-collapse whitespace-normal break-words table-fixed'>
          <thead className='sticky top-0 z-20 shadow-sm'>
            <tr className='bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold'>
              <Th col='project' label='Project' className='w-[20%]' />
              <Th col='manager' label='Project Manager' className='w-[10%]' />
              <Th col='dueDate' label='Due Date' className='w-[9%]' />
              <Th col='status' label='Status' className='w-[8%]' />
              <Th col='budget' label='Budget (Hrs)' className='w-[8%] text-right' />
              <Th col='consumed' label='Consumed (Hrs)' className='w-[9%] text-right' />
              <Th col='sales' label='Sales (ZAR)' className='w-[13%] text-right' />
              <Th col='cost' label='Cost (ZAR)' className='w-[13%] text-right' />
              <Th col='progress' label='Progress' className='w-[6%] text-right' />
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100 dark:divide-slate-800'>
            {sorted.map((row) => (
              <tr key={row._id} className='hover:bg-indigo-50/30 dark:hover:bg-slate-800/50 transition-colors'>
                <td className='px-4 py-3 align-top font-medium text-slate-800 dark:text-slate-100 text-sm leading-relaxed'>
                  <button
                    onClick={() => onViewDetails(row)}
                    className='text-left w-full hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors font-bold underline decoration-indigo-200 dark:decoration-indigo-700 underline-offset-4 focus:outline-none'
                    title='View Project Summary'
                  >
                    {row.Project}
                  </button>
                </td>
                <td className='px-4 py-3 align-top text-sm text-slate-600 dark:text-slate-300'>
                  {formatManagerName(row[UI_PROJECT_KEYS.PROJECT_MANAGER]) || '—'}
                </td>
                <td className='px-4 py-3 align-top text-sm text-slate-600 dark:text-slate-300'>
                  {row[UI_PROJECT_KEYS.DUE_DATE] || '—'}
                </td>
                <td className='px-4 py-3 align-top'>
                  {(() => {
                    const key = row._statusKey || 'on_track';
                    const style = STATUS_KEY_BADGE[key] || STATUS_KEY_BADGE['on_track'];
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                        {row[UI_PROJECT_KEYS.STATUS] || '—'}
                      </span>
                    );
                  })()}
                </td>
                <td className='px-4 py-3 align-top text-right text-sm text-slate-600 dark:text-slate-300'>
                  {(row[UI_PROJECT_KEYS.BUDGET_HOURS] || 0).toLocaleString('en-US')}
                </td>
                <td className='px-4 py-3 align-top text-right text-sm text-slate-600 dark:text-slate-300'>
                  {row[UI_PROJECT_KEYS.CONSUMED_TIME].toFixed(2)}
                </td>
                <td className='px-4 py-3 align-top text-right text-sm text-emerald-600 dark:text-emerald-400 font-medium'>
                  {formatCurrency(row[UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT])}
                </td>
                <td className='px-4 py-3 align-top text-right text-sm text-rose-600 dark:text-rose-400 font-medium'>
                  {formatCurrency(row[UI_PROJECT_KEYS.TOTAL_COSTING])}
                </td>
                <td className='px-4 py-3 align-top text-right text-sm text-slate-600 dark:text-slate-300 font-bold'>
                  {Math.round((row[UI_PROJECT_KEYS.ACTUAL_PROGRESS] || 0) * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EditableTable;
