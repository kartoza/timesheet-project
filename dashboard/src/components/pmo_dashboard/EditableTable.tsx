import React from 'react';
import { PencilLine, Trash2 } from 'lucide-react';
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

const EditableTable: React.FC<EditableTableProps> = ({
  data,
  onUpdateDataRow,
  onDeleteDataRow,
  onViewDetails,
}) => {
  const handleChange = (id: string, field: string, value: string, type: 'text' | 'number' = 'text') => {
    let parsedValue: string | number = value;
    if (type === 'number') {
      parsedValue = parseFloat(value);
      if (Number.isNaN(parsedValue)) {
        parsedValue = 0;
      }
    }
    void onUpdateDataRow(id, field, parsedValue);
  };

  const formatNumberInt = (val: number | string) => {
    if (val === null || val === '') return '';
    const num = parseFloat(String(val));
    if (Number.isNaN(num)) return String(val);
    return Math.round(num).toLocaleString('en-US');
  };

  return (
    <div className='glass-card mb-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none rounded-2xl flex flex-col overflow-hidden'>
      <div className='p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50'>
        <h3 className='text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2'>
          <PencilLine size={18} className='text-indigo-600' /> Kartoza Running Projects
        </h3>
        <p className='text-sm font-medium text-slate-500'>Live-syncs with Dashboard</p>
      </div>

      <div className='w-full max-h-[65vh] overflow-y-auto pb-2 relative print:max-h-none print:overflow-visible print:border-none'>
        <table className='w-full text-left border-collapse whitespace-normal break-words table-fixed'>
          <thead className='sticky top-0 z-20 shadow-sm'>
            <tr className='bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-bold'>
              <th className='px-4 py-3 w-[20%]'>Project</th>
              <th className='px-4 py-3 w-[10%]'>Project Manager</th>
              <th className='px-4 py-3 w-[9%]'>Due Date</th>
              <th className='px-4 py-3 w-[8%]'>Status</th>
              <th className='px-4 py-3 w-[8%] text-right'>Budget (Hrs)</th>
              <th className='px-4 py-3 w-[9%] text-right'>Consumed (Hrs)</th>
              <th className='px-4 py-3 w-[13%] text-right'>Sales (ZAR)</th>
              <th className='px-4 py-3 w-[13%] text-right'>Cost (ZAR)</th>
              <th className='px-4 py-3 w-[6%] text-right'>Progress</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100'>
            {data.map((row) => (
              <tr key={row._id} className='hover:bg-indigo-50/30 transition-colors group'>
                <td className='px-4 py-3 align-top font-medium text-slate-800 text-sm leading-relaxed'>
                  <button
                    onClick={() => onViewDetails(row)}
                    className='text-left w-full hover:text-indigo-600 transition-colors font-bold underline decoration-indigo-200 underline-offset-4 focus:outline-none'
                    title='View Project Summary'
                  >
                    {row.Project}
                  </button>
                </td>
                <td className='px-4 py-3 align-top'>
                  <div className='text-sm text-slate-600 dark:text-slate-300 px-2 py-1'>
                    {formatManagerName(row[UI_PROJECT_KEYS.PROJECT_MANAGER]) || '—'}
                  </div>
                </td>
                <td className='px-4 py-3 align-top bg-white/50 dark:bg-slate-800/50 group-hover:bg-transparent'>
                  <input
                    type='date'
                    value={row[UI_PROJECT_KEYS.DUE_DATE] || ''}
                    onChange={(e) => handleChange(row._id, UI_PROJECT_KEYS.DUE_DATE, e.target.value)}
                    className='w-full bg-transparent border-b border-transparent focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-700 px-1 py-1 outline-none text-sm text-slate-600 dark:text-slate-300 transition-all font-medium'
                  />
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
                  {formatNumberInt(row[UI_PROJECT_KEYS.BUDGET_HOURS] || 0)}
                </td>
                <td className='px-4 py-3 align-top text-right text-sm text-slate-600 dark:text-slate-300'>
                  {row[UI_PROJECT_KEYS.CONSUMED_TIME].toFixed(2)}
                </td>
                <td className='px-4 py-3 align-top bg-white/50 dark:bg-slate-800/50 group-hover:bg-transparent'>
                  <input
                    type='text'
                    value={formatNumberInt(row[UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT] || 0)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/,/g, '');
                      handleChange(row._id, UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT, val, 'number');
                    }}
                    className='w-full bg-transparent border-b border-transparent focus:border-emerald-400 focus:bg-white dark:focus:bg-slate-700 outline-none text-sm text-emerald-600 font-medium transition-all text-right'
                  />
                </td>
                <td className='px-4 py-3 align-top bg-white/50 dark:bg-slate-800/50 group-hover:bg-transparent'>
                  <input
                    type='text'
                    value={formatNumberInt(row[UI_PROJECT_KEYS.TOTAL_COSTING] || 0)}
                    onChange={(e) => {
                      const val = e.target.value.replace(/,/g, '');
                      handleChange(row._id, UI_PROJECT_KEYS.TOTAL_COSTING, val, 'number');
                    }}
                    className='w-full bg-transparent border-b border-transparent focus:border-rose-400 focus:bg-white dark:focus:bg-slate-700 outline-none text-sm text-rose-600 font-medium transition-all text-right'
                  />
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
