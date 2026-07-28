import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { IssueSummaryRow } from '../../types/pmo_dashboard';

type IssuePriorityChartProps = {
  data: IssueSummaryRow[];
  emptyMessage: string;
};

// Validated categorical order (dataviz skill palette.md, slots 1-5): all adjacent
// pairs pass CVD + normal-vision separation in both light and dark modes.
const SERIES = [
  { key: 'total', label: 'Total', color: '#2a78d6' },
  { key: 'low', label: 'Low', color: '#008300' },
  { key: 'medium', label: 'Medium', color: '#e87ba4' },
  { key: 'high', label: 'High', color: '#eda100' },
  { key: 'closed', label: 'Closed', color: '#1baf7a' },
] as const;

const truncateLabel = (name: string, max = 14) => (name.length > max ? `${name.slice(0, max - 1)}…` : name);

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const row: IssueSummaryRow = payload[0].payload;
    const closedRate = row.total > 0 ? Math.round((row.closed / row.total) * 100) : 0;
    return (
      <div className='bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-4 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl min-w-[180px]'>
        <p className='font-bold text-slate-800 dark:text-slate-100'>{row.customer}</p>
        <div className='mt-2 space-y-1'>
          {SERIES.map((s) => (
            <p key={s.key} className='flex items-center gap-2 text-sm'>
              <span className='w-2.5 h-2.5 rounded-full' style={{ backgroundColor: s.color }} />
              <span className='text-slate-500 dark:text-slate-400'>{s.label}</span>
              <span className='ml-auto font-bold text-slate-800 dark:text-slate-100'>{row[s.key]}</span>
            </p>
          ))}
        </div>
        <p className='text-xs text-slate-400 dark:text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100 dark:border-slate-800'>
          Closed rate: {closedRate}%
        </p>
      </div>
    );
  }
  return null;
};

const renderLegend = () => (
  <div className='flex flex-wrap justify-center gap-x-5 gap-y-2 pt-3 px-2'>
    {SERIES.map((s) => (
      <span key={s.key} className='inline-flex items-center gap-2'>
        <span className='w-3 h-3 rounded-full shrink-0' style={{ backgroundColor: s.color }} />
        <span className='text-sm font-semibold text-slate-600 dark:text-slate-300'>{s.label}</span>
      </span>
    ))}
  </div>
);

const IssuePriorityChart: React.FC<IssuePriorityChartProps> = ({ data, emptyMessage }) => (
  <div className='w-full h-full flex flex-col'>
    {data.length === 0 ? (
      <div className='flex-1 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 font-medium'>
        {emptyMessage}
      </div>
    ) : (
      <div className='flex-1 min-h-0'>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 8 }} barGap={2}>
            <CartesianGrid strokeDasharray='3 3' stroke='#e1e0d9' vertical={false} />
            <XAxis
              dataKey='customer'
              tickFormatter={(value: string) => truncateLabel(value)}
              tick={{ fontSize: 11, fill: '#898781' }}
              interval={0}
              angle={-20}
              textAnchor='end'
              height={60}
            />
            <YAxis allowDecimals={false} domain={[0, 'dataMax']} tick={{ fontSize: 11, fill: '#898781' }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.1)' }} />
            <Legend content={renderLegend} />
            {SERIES.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} maxBarSize={16} radius={[3, 3, 0, 0]}>
                <LabelList dataKey={s.key} position='top' style={{ fontSize: 10, fontWeight: 700, fill: '#52514e' }} />
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

export default IssuePriorityChart;
