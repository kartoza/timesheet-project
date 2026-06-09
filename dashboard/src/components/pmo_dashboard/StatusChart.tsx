import React from 'react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { UIProjectRow } from '../../types/pmo_dashboard';

type StatusChartProps = {
  data: UIProjectRow[];
  onStatusClick?: (status: string) => void;
};

const STATUS_COLORS: Record<string, string> = {
  on_track:  '#10B981',
  warning:   '#EAB308',
  at_risk:   '#EF4444',
  overdue:   '#3B82F6',
  on_hold:   '#94A3B8',
  completed: '#7C3AED',
};

const FALLBACK_COLORS = ['#8B5CF6', '#64748B', '#06B6D4', '#F43F5E'];

const StatusChart: React.FC<StatusChartProps> = ({ data, onStatusClick }) => {
  const statusGroups: Record<string, { label: string; count: number }> = {};
  data.forEach((d) => {
    const key = d._statusKey || 'on_track';
    const label = d.Status || key;
    if (!statusGroups[key]) statusGroups[key] = { label, count: 0 };
    statusGroups[key].count++;
  });

  const chartData = Object.entries(statusGroups).map(([key, { label, count }]) => ({
    name: label,
    statusKey: key,
    value: count,
  }));

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className='flex flex-wrap justify-center gap-x-5 gap-y-2 pt-3 px-2'>
        {payload.map((entry: any, index: number) => (
          <button
            key={index}
            onClick={() => onStatusClick && onStatusClick(entry.value)}
            className='flex items-center gap-2 hover:opacity-70 transition-opacity'
          >
            <span className='w-3 h-3 rounded-full shrink-0' style={{ backgroundColor: entry.color }} />
            <span className='text-sm font-semibold text-slate-600 dark:text-slate-300'>{entry.value}</span>
            <span className='text-xs text-slate-400 font-medium'>({entry.payload.value})</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className='w-full h-[350px] flex flex-col'>
      <div className='flex-1 min-h-0'>
        <ResponsiveContainer width='100%' height='100%'>
          <PieChart>
            <Pie
              data={chartData}
              cx='50%'
              cy='50%'
              innerRadius={80}
              outerRadius={120}
              paddingAngle={3}
              dataKey='value'
              onClick={(entry: any) => onStatusClick && onStatusClick(entry.name)}
              className='cursor-pointer'
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STATUS_COLORS[entry.statusKey] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                  style={{ outline: 'none' }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className='bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-4 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl'>
        <p className='font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2'>
          <div className='w-3 h-3 rounded-full' style={{ backgroundColor: payload[0].payload.fill }}></div>
          {payload[0].name}
        </p>
        <p className='text-slate-600 dark:text-slate-300 font-medium mt-1'>
          Count: <span className='text-slate-900 dark:text-slate-100 font-bold'>{payload[0].value} Projects</span>
        </p>
      </div>
    );
  }
  return null;
};

export default StatusChart;
