import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { IssueSummaryRow } from '../../types/pmo_dashboard';

type IssuePriorityChartProps = {
  title: string;
  data: IssueSummaryRow[];
  emptyMessage: string;
};

const STATUS_COLORS = {
  low: '#0ca30c',
  medium: '#fab219',
  high: '#d03b3b',
};

const LEGEND_ITEMS = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
] as const;

const truncateLabel = (name: string, max = 14) => (name.length > max ? `${name.slice(0, max - 1)}…` : name);

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const row: IssueSummaryRow = payload[0].payload;
    const closedRate = row.total > 0 ? Math.round((row.closed / row.total) * 100) : 0;
    return (
      <div className='bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-4 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl min-w-[180px]'>
        <p className='font-bold text-slate-800 dark:text-slate-100'>{row.project}</p>
        <p className='text-slate-600 dark:text-slate-300 font-medium mt-1'>
          Total: <span className='text-slate-900 dark:text-slate-100 font-bold'>{row.total}</span>
        </p>
        <div className='mt-2 space-y-1'>
          <p className='flex items-center gap-2 text-sm'>
            <span className='w-2.5 h-2.5 rounded-full' style={{ backgroundColor: STATUS_COLORS.low }} />
            <span className='text-slate-500 dark:text-slate-400'>Low</span>
            <span className='ml-auto font-bold text-slate-800 dark:text-slate-100'>{row.low}</span>
          </p>
          <p className='flex items-center gap-2 text-sm'>
            <span className='w-2.5 h-2.5 rounded-full' style={{ backgroundColor: STATUS_COLORS.medium }} />
            <span className='text-slate-500 dark:text-slate-400'>Medium</span>
            <span className='ml-auto font-bold text-slate-800 dark:text-slate-100'>{row.medium}</span>
          </p>
          <p className='flex items-center gap-2 text-sm'>
            <span className='w-2.5 h-2.5 rounded-full' style={{ backgroundColor: STATUS_COLORS.high }} />
            <span className='text-slate-500 dark:text-slate-400'>High</span>
            <span className='ml-auto font-bold text-slate-800 dark:text-slate-100'>{row.high}</span>
          </p>
        </div>
        <p className='text-xs text-slate-400 dark:text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100 dark:border-slate-800'>
          Closed: {row.closed} ({closedRate}%)
        </p>
      </div>
    );
  }
  return null;
};

const renderLegend = () => (
  <div className='flex flex-wrap justify-center gap-x-5 gap-y-2 pt-3 px-2'>
    {LEGEND_ITEMS.map((item) => (
      <span key={item.key} className='inline-flex items-center gap-2'>
        <span className='w-3 h-3 rounded-full shrink-0' style={{ backgroundColor: STATUS_COLORS[item.key] }} />
        <span className='text-sm font-semibold text-slate-600 dark:text-slate-300'>{item.label}</span>
      </span>
    ))}
  </div>
);

const IssuePriorityChart: React.FC<IssuePriorityChartProps> = ({ title, data, emptyMessage }) => (
  <div className='glass-card p-5 sm:p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl'>
    <h3 className='text-base font-bold text-slate-800 dark:text-white mb-4'>{title}</h3>

    {data.length === 0 ? (
      <div className='h-[350px] flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 font-medium'>
        {emptyMessage}
      </div>
    ) : (
      <div className='w-full h-[350px] flex flex-col'>
        <div className='flex-1 min-h-0'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }} barCategoryGap='30%'>
              <CartesianGrid strokeDasharray='3 3' stroke='#e1e0d9' vertical={false} />
              <XAxis
                dataKey='project'
                tickFormatter={(value: string) => truncateLabel(value)}
                tick={{ fontSize: 11, fill: '#898781' }}
                interval={0}
                angle={-20}
                textAnchor='end'
                height={60}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#898781' }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
              <Legend content={renderLegend} />
              <Bar dataKey='low' name='Low' stackId='priority' fill={STATUS_COLORS.low} maxBarSize={24} />
              <Bar dataKey='medium' name='Medium' stackId='priority' fill={STATUS_COLORS.medium} maxBarSize={24} />
              <Bar dataKey='high' name='High' stackId='priority' fill={STATUS_COLORS.high} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    )}
  </div>
);

export default IssuePriorityChart;
