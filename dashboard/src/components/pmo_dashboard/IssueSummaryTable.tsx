import React from 'react';
import { IssueSummaryRow } from '../../types/pmo_dashboard';

type IssueSummaryTableProps = {
  title: string;
  data: IssueSummaryRow[];
  emptyMessage: string;
};

const IssueSummaryTable: React.FC<IssueSummaryTableProps> = ({ title, data, emptyMessage }) => (
  <div className='glass-card bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden'>
    <div className='px-5 py-4 border-b border-slate-100 dark:border-slate-800'>
      <h3 className='text-base font-bold text-slate-800 dark:text-white'>{title}</h3>
    </div>

    {data.length === 0 ? (
      <div className='p-8 text-center text-sm text-slate-400 dark:text-slate-500 font-medium'>
        {emptyMessage}
      </div>
    ) : (
      <div className='overflow-x-auto'>
        <table className='w-full text-left'>
          <thead className='bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-700 tracking-wider'>
            <tr>
              <th className='px-4 py-3'>Project</th>
              <th className='px-4 py-3 text-right'>Tickets Total</th>
              <th className='px-4 py-3 text-right'>Low</th>
              <th className='px-4 py-3 text-right'>Medium</th>
              <th className='px-4 py-3 text-right'>High</th>
              <th className='px-4 py-3 text-right'>Closed</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-slate-100 dark:divide-slate-800'>
            {data.map((row) => (
              <tr key={row.customer} className='hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 transition-colors'>
                <td className='px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 text-sm'>{row.customer}</td>
                <td className='px-4 py-3 text-right font-bold text-slate-800 dark:text-slate-100 text-sm'>{row.total}</td>
                <td className='px-4 py-3 text-right text-slate-600 dark:text-slate-400 text-sm'>{row.low}</td>
                <td className='px-4 py-3 text-right text-slate-600 dark:text-slate-400 text-sm'>{row.medium}</td>
                <td className='px-4 py-3 text-right text-slate-600 dark:text-slate-400 text-sm'>{row.high}</td>
                <td className='px-4 py-3 text-right text-slate-600 dark:text-slate-400 text-sm'>{row.closed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

export default IssueSummaryTable;
