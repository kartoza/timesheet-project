import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { UI_PROJECT_KEYS } from '../../constants/pmo_dashboard';
import { UIProjectRow } from '../../types/pmo_dashboard';

type GroupBy = 'project_manager' | 'relations_manager';

type ManagerRevenueChartProps = {
  data: UIProjectRow[];
  group_by?: GroupBy;
};

const ManagerRevenueChart: React.FC<ManagerRevenueChartProps> = ({ data, group_by = 'project_manager' }) => {
  const managerKey = group_by === 'project_manager' ? UI_PROJECT_KEYS.PROJECT_MANAGER : UI_PROJECT_KEYS.RELATIONSHIP_MANAGER;

  const managerRevenue: Record<string, number> = {};
  data.forEach((d) => {
    const manager = d[managerKey] || 'Unassigned';
    const revenue = d[UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT] || 0;
    managerRevenue[manager] = (managerRevenue[manager] || 0) + revenue;
  });

  const chartData = Object.keys(managerRevenue)
    .map((key) => ({
      name: key,
      Revenue: managerRevenue[key],
    }))
    .sort((a, b) => b.Revenue - a.Revenue);

  const yAxisWidth = Math.min(
    Math.max(...chartData.map((d) => d.name.length)) * 8 + 16,
    200,
  );

  return (
    <div className='w-full h-[350px] mt-2'>
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart data={chartData} layout='vertical' margin={{ top: 10, right: 30, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray='3 3' horizontal={false} vertical stroke='#E2E8F0' />
          <XAxis type='number' axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }} tickFormatter={(val) => `R${(Number(val) / 1000000).toFixed(1)}M`} />
          <YAxis dataKey='name' type='category' axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 13, fontWeight: 600 }} width={yAxisWidth} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} />
          <Bar dataKey='Revenue' fill='#6366F1' radius={[0, 6, 6, 0]} barSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const formatCurrency = (val: number) => new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      maximumFractionDigits: 0,
    }).format(val);

    return (
      <div className='bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-4 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl'>
        <p className='font-bold text-slate-800 mb-1'>{payload[0].payload.name}</p>
        <p className='text-indigo-600 font-semibold'>{formatCurrency(payload[0].value)} Revenue</p>
      </div>
    );
  }
  return null;
};

export default ManagerRevenueChart;
