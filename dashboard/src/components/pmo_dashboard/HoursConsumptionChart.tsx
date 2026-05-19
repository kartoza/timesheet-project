import React from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { UI_PROJECT_KEYS } from '../../constants/pmo_dashboard';
import { UIProjectRow } from '../../types/pmo_dashboard';

type HoursConsumptionChartProps = {
  data: UIProjectRow[];
};

const HoursConsumptionChart: React.FC<HoursConsumptionChartProps> = ({ data }) => {
  const chartData = data.map((d) => {
    const rawProgress = d[UI_PROJECT_KEYS.ACTUAL_PROGRESS] || 0;
    const progressPercent = Number(rawProgress) * 100;

    return {
      name: d.Project || 'Unknown Project',
      'Budget (hrs)': d[UI_PROJECT_KEYS.BUDGET_HOURS] || 0,
      'Consumed (hrs)': d[UI_PROJECT_KEYS.CONSUMED_TIME] || 0,
      'Progress (%)': progressPercent,
    };
  });

  const minWidth = Math.max(200, chartData.length * 150);

  return (
    <div className='w-full h-full min-h-[400px] overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar'>
      <div style={{ minWidth: `${minWidth}px`, height: '100%' }}>
        <ResponsiveContainer width='100%' height='100%'>
          <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#E2E8F0' />

            <XAxis dataKey='name' axisLine={false} tickLine={false} tick={<CustomXAxisTick />} interval={0} height={60} />
            <YAxis yAxisId='left' axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }} />
            <YAxis yAxisId='right' orientation='right' axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} domain={[0, 'dataMax']} tick={{ fill: '#14B8A6', fontSize: 12, fontWeight: 700 }} />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} />
            <Legend align='right' verticalAlign='top' iconType='circle' wrapperStyle={{ paddingBottom: '20px', fontWeight: 600, fontSize: '13px' }} />

            <Bar yAxisId='left' dataKey='Budget (hrs)' fill='#94A3B8' maxBarSize={40} barSize={24} radius={[4, 4, 0, 0]} />
            <Bar yAxisId='left' dataKey='Consumed (hrs)' fill='#F59E0B' maxBarSize={40} barSize={24} radius={[4, 4, 0, 0]} />
            <Line yAxisId='right' type='monotone' dataKey='Progress (%)' stroke='#14B8A6' strokeWidth={4} dot={{ r: 5, fill: '#fff', strokeWidth: 3 }} activeDot={{ r: 8 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

function truncate(str: string, n: number) {
  return str && str.length > n ? `${str.substr(0, n - 1)}...` : str;
}

const CustomXAxisTick = ({ x, y, payload }: any) => (
  <g transform={`translate(${x},${y})`}>
    <text x={0} y={0} dy={16} textAnchor='middle' fill='#64748B' fontSize={12} fontWeight={500}>
      <title>{payload.value}</title>
      {truncate(payload.value, 18)}
    </text>
  </g>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className='bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl'>
        <p className='font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2 truncate max-w-[250px]' title={label}>
          {label}
        </p>
        {payload.map((entry: any, index: number) => {
          const isProgress = entry.name === 'Progress (%)';
          const val = isProgress ? `${entry.value.toFixed(1)}%` : entry.value.toFixed(1);
          return (
            <div key={index} className='flex justify-between items-center gap-6 py-1 text-sm'>
              <span className='flex items-center gap-2'>
                <div className='w-3 h-3 rounded-full shadow-sm' style={{ backgroundColor: entry.color }}></div>
                <span className='text-slate-600 font-medium'>{entry.name}</span>
              </span>
              <span className='font-bold text-slate-900'>{val}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export default HoursConsumptionChart;
