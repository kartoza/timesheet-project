import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { UI_PROJECT_KEYS } from '../../constants/pmo_dashboard';
import { UIProjectRow } from '../../types/pmo_dashboard';

type BillableHoursChartProps = {
  data: UIProjectRow[];
};

const BillableHoursChart: React.FC<BillableHoursChartProps> = ({ data }) => {
  const chartData = useMemo(() => {
    return data
      .filter((proj) => proj.Status !== '🟣 Completed' && proj.Status !== '⚫ Cancelled')
      .map((proj) => {
        let totalConsumed = 0;
        let totalBillable = 0;

        if (proj.SubTasks && Array.isArray(proj.SubTasks)) {
          proj.SubTasks.forEach((subtask) => {
            totalConsumed += subtask.consumedTime || 0;
            totalBillable += subtask.billableHours || 0;
          });
        } else {
          totalConsumed = proj[UI_PROJECT_KEYS.CONSUMED_TIME] || 0;
          totalBillable = Math.floor(totalConsumed * 0.8);
        }

        const nonBillable = Math.max(0, totalConsumed - totalBillable);
        const efficiency = totalConsumed > 0 ? ((totalBillable / totalConsumed) * 100).toFixed(1) : '0';

        return {
          name: proj.Project?.split(' (')[0] || 'Unknown',
          fullName: proj.Project,
          billable: totalBillable,
          nonBillable,
          total: totalConsumed,
          efficiency: parseFloat(efficiency),
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [data]);

  if (chartData.length === 0) {
    return <div className='flex h-full items-center justify-center text-slate-400'>No data available</div>;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      return (
        <div className='bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-4 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl'>
          <p className='font-bold text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-700 pb-2'>{entry.fullName}</p>
          <div className='flex flex-col gap-1'>
            <p className='text-emerald-600 dark:text-emerald-400 font-semibold text-sm flex justify-between gap-4'>
              <span className='text-slate-500 dark:text-slate-400'>Billable:</span>
              <span>{+entry.billable.toFixed(2)}h</span>
            </p>
            <p className='text-rose-500 dark:text-rose-400 font-semibold text-sm flex justify-between gap-4'>
              <span className='text-slate-500 dark:text-slate-400'>Non-Billable:</span>
              <span>{+entry.nonBillable.toFixed(2)}h</span>
            </p>
            <div className='mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center'>
              <span className='text-slate-500 dark:text-slate-400 text-xs font-bold uppercase'>Efficiency</span>
              <span className={`text-sm font-extrabold ${entry.efficiency >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'}`}>
                {entry.efficiency}%
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className='w-full h-full min-h-[350px] overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar text-xs'>
      <div style={{ minWidth: Math.max(300, chartData.length * 80), height: '100%' }}>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 90 }}>
            <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' className='dark:opacity-20' />
            <XAxis dataKey='name' axisLine={false} tickLine={false} tick={<CustomXAxisTick />} interval={0} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
            <Legend verticalAlign='top' wrapperStyle={{ paddingBottom: '10px' }} />

            <Bar dataKey='billable' name='Billable Hours' stackId='a' fill='#10b981' barSize={32} />
            <Bar dataKey='nonBillable' name='Non-Billable Hours' stackId='a' fill='#f43f5e' radius={[4, 4, 0, 0]} barSize={32} />
          </BarChart>
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
    <text
      x={0}
      y={0}
      dy={4}
      dx={-4}
      textAnchor='end'
      fill='#64748B'
      fontSize={11}
      fontWeight={600}
      transform='rotate(-45)'
    >
      <title>{payload.value}</title>
      {truncate(payload.value, 22)}
    </text>
  </g>
);

export default BillableHoursChart;
