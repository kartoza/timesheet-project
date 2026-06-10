import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { UI_PROJECT_KEYS } from '../../constants/pmo_dashboard';
import { UIProjectRow } from '../../types/pmo_dashboard';
import { formatManagerName } from '../../utils/pmo_dashboard';

type ManagerWorkloadChartProps = {
  data: UIProjectRow[];
  overloadThreshold: number;
};

const ManagerWorkloadChart: React.FC<ManagerWorkloadChartProps> = ({ data, overloadThreshold }) => {
  const chartData = useMemo(() => {
    const managerStats: Record<string, { name: string; projectsCount: number; totalHours: number }> = {};

    data.forEach((proj) => {
      const status = proj.Status;
      const isActive = status !== '🟣 Completed' && status !== '⚫ Cancelled';
      if (!isActive) return;

      const pm = formatManagerName(proj[UI_PROJECT_KEYS.PROJECT_MANAGER]) || 'Unassigned';

      if (!managerStats[pm]) {
        managerStats[pm] = { name: pm, projectsCount: 0, totalHours: 0 };
      }

      managerStats[pm].projectsCount += 1;
      managerStats[pm].totalHours += proj[UI_PROJECT_KEYS.BUDGET_HOURS] || 0;
    });

    return Object.values(managerStats).sort((a, b) => b.projectsCount - a.projectsCount);
  }, [data]);

  if (chartData.length === 0) {
    return <div className='flex h-full items-center justify-center text-slate-400'>No active workload data available</div>;
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className='bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-4 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl'>
          <p className='font-bold text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-700 pb-2'>{label}</p>
          <div className='flex flex-col gap-1'>
            <p className='text-indigo-600 dark:text-indigo-400 font-semibold text-sm'>
              <span className='text-slate-500 dark:text-slate-400'>Active Projects:</span> {payload[0].value}
            </p>
            <p className='text-amber-600 dark:text-amber-400 font-semibold text-sm'>
              <span className='text-slate-500 dark:text-slate-400'>Total Hours Managed:</span> {payload[1].value}h
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className='w-full h-full min-h-[300px] text-xs'>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
          <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#e2e8f0' className='dark:opacity-20' />
          <XAxis dataKey='name' axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} dy={10} interval={0} tickFormatter={(value) => String(value).split(' ')[0]} />
          <YAxis yAxisId='left' axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dx={-10} allowDecimals={false} />
          <YAxis yAxisId='right' orientation='right' axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dx={10} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />

          <Bar yAxisId='left' dataKey='projectsCount' name='Active Projects' fill='#6366f1' radius={[4, 4, 0, 0]} barSize={32}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.projectsCount > overloadThreshold ? '#ef4444' : '#6366f1'} />
            ))}
          </Bar>
          <Bar yAxisId='right' dataKey='totalHours' name='Budget Hours' fill='#f59e0b' radius={[4, 4, 0, 0]} barSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ManagerWorkloadChart;
