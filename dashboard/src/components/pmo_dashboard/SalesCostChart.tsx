import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { UI_PROJECT_KEYS } from '../../constants/pmo_dashboard';
import { UIProjectRow } from '../../types/pmo_dashboard';

type SortKey = 'name' | 'Sales' | 'Cost' | 'ratio';

type SalesCostChartProps = {
  data: UIProjectRow[];
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'Sales', label: 'Sales' },
  { key: 'Cost', label: 'Cost' },
  { key: 'ratio', label: 'Sales/Cost' },
];

const SalesCostChart: React.FC<SalesCostChartProps> = ({ data }) => {
  const [sortBy, setSortBy] = useState<SortKey>('Sales');

  const chartData = data
    .map((d) => {
      const sales = d[UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT] || 0;
      const cost = d[UI_PROJECT_KEYS.TOTAL_COSTING] || 0;
      return {
        name: d.Project || 'Unknown Project',
        Sales: sales,
        Cost: cost,
        ratio: cost > 0 ? sales / cost : 0,
      };
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return b[sortBy] - a[sortBy];
    });

  const minWidth = Math.max(200, chartData.length * 150);

  return (
    <div className='w-full h-full min-h-[400px] flex flex-col'>
      <div className='flex items-center gap-2 mb-2 flex-wrap'>
        <span className='text-xs text-slate-400 font-medium'>Sort by:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              sortBy === opt.key
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className='flex-1 overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar'>
      <div style={{ minWidth: `${minWidth}px`, height: '100%' }}>
        <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#E2E8F0' />
            <XAxis dataKey='name' axisLine={false} tickLine={false} tick={<CustomXAxisTick />} interval={0} />
            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }} tickFormatter={(val) => `R${(Number(val) / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} />
            <Legend align='right' verticalAlign='top' iconType='circle' wrapperStyle={{ paddingBottom: '20px', fontWeight: 600, fontSize: '13px' }} />
            <Bar dataKey='Sales' fill='#818CF8' maxBarSize={48} barSize={32} radius={[4, 4, 0, 0]} />
            <Bar dataKey='Cost' fill='#FB7185' maxBarSize={48} barSize={32} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
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
    const formatCurrency = (val: number) => new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      maximumFractionDigits: 0,
    }).format(val);

    return (
      <div className='bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl'>
        <p className='font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2 truncate max-w-[250px]' title={label}>
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className='flex justify-between items-center gap-6 py-1 text-sm'>
            <span className='flex items-center gap-2'>
              <div className='w-3 h-3 rounded-full shadow-sm' style={{ backgroundColor: entry.color }}></div>
              <span className='text-slate-600 font-medium'>{entry.name}</span>
            </span>
            <span className='font-bold text-slate-900'>{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default SalesCostChart;
