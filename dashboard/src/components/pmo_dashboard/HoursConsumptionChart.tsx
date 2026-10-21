import React, { useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Cell,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AT_RISK_STATUS_KEYS, UI_PROJECT_KEYS } from '../../constants/pmo_dashboard';
import { UIProjectRow } from '../../types/pmo_dashboard';

type SortKey = 'name' | 'budget' | 'consumed' | 'progress' | 'burnRate' | 'gap';

export type HoursChartMode = 'hours' | 'normalised';

type HoursConsumptionChartProps = {
  data: UIProjectRow[];
  mode: HoursChartMode;
  onModeChange: (mode: HoursChartMode) => void;
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'budget', label: 'Budget' },
  { key: 'consumed', label: 'Consumed' },
  { key: 'progress', label: 'Progress' },
  { key: 'burnRate', label: 'Burn Rate' },
  { key: 'gap', label: 'Gap' },
];

const MODE_OPTIONS: { key: HoursChartMode; label: string }[] = [
  { key: 'hours', label: 'Hours' },
  { key: 'normalised', label: 'Normalised' },
];

export const CONSUMED_COLOR = '#F59E0B';
export const AT_RISK_COLOR = '#EF4444';
export const PROGRESS_COLOR = '#14B8A6';

// Each project is scaled to its own budget, so 100% is the budget line.
export const toNormalisedRow = (d: UIProjectRow) => {
  const budget = d[UI_PROJECT_KEYS.BUDGET_HOURS] || 0;
  const consumed = d[UI_PROJECT_KEYS.CONSUMED_TIME] || 0;
  return {
    name: d.Project || 'Unknown Project',
    budget,
    consumed,
    'Consumed (% of budget)': budget > 0 ? (consumed / budget) * 100 : 0,
    'Progress (%)': Number(d[UI_PROJECT_KEYS.ACTUAL_PROGRESS] || 0) * 100,
    isAtRisk: AT_RISK_STATUS_KEYS.has(d._statusKey || ''),
  };
};

export const NORMALISED_LEGEND = [
  { value: 'Consumed (% of budget)', type: 'circle' as const, color: CONSUMED_COLOR },
  { value: 'Consumed (at risk)', type: 'circle' as const, color: AT_RISK_COLOR },
  { value: 'Progress (%)', type: 'circle' as const, color: PROGRESS_COLOR },
];

// Keeps the 100% budget line in view even when every project is under budget.
export const normalisedDomainMax = (dataMax: number) => Math.max(100, Math.ceil(dataMax / 10) * 10);


const HoursConsumptionChart: React.FC<HoursConsumptionChartProps> = ({ data, mode, onModeChange }) => {
  const [sortBy, setSortBy] = useState<SortKey>('budget');
  const isNormalised = mode === 'normalised';

  const chartData = data
    .map((d) => {
      const budget = d[UI_PROJECT_KEYS.BUDGET_HOURS] || 0;
      const consumed = d[UI_PROJECT_KEYS.CONSUMED_TIME] || 0;
      const progressPercent = Number(d[UI_PROJECT_KEYS.ACTUAL_PROGRESS] || 0) * 100;
      const burnRate = budget > 0 ? consumed / budget : 0;

      return {
        ...toNormalisedRow(d),
        'Budget (hrs)': budget,
        'Consumed (hrs)': consumed,
        'Progress (%)': progressPercent,
        burnRate,
        gap: burnRate * 100 - progressPercent,
      };
    })
    .filter((d) => !isNormalised || d.budget > 0)
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'budget') return b['Budget (hrs)'] - a['Budget (hrs)'];
      if (sortBy === 'consumed') return b['Consumed (hrs)'] - a['Consumed (hrs)'];
      if (sortBy === 'progress') return b['Progress (%)'] - a['Progress (%)'];
      if (sortBy === 'gap') return b.gap - a.gap;
      return b.burnRate - a.burnRate;
    });

  const hiddenCount = isNormalised ? data.length - chartData.length : 0;

  const minWidth = Math.max(200, chartData.length * 150);

  return (
    <div className='w-full h-full min-h-[400px] flex flex-col'>
      <div className='flex items-center gap-2 mb-2 flex-wrap'>
        <div className='flex rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 mr-2'>
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => onModeChange(opt.key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                mode === opt.key
                  ? 'bg-white dark:bg-slate-600 text-indigo-600 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className='text-xs text-slate-400 dark:text-slate-500 font-medium'>Sort by:</span>
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              sortBy === opt.key
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {opt.label}
          </button>
        ))}
        {hiddenCount > 0 && (
          <span className='text-xs text-slate-400 dark:text-slate-500 ml-auto'>
            {hiddenCount} project{hiddenCount === 1 ? '' : 's'} without budget hidden
          </span>
        )}
      </div>
      <div className='flex-1 overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar'>
      <div style={{ minWidth: `${minWidth}px`, height: '100%' }}>
        <ResponsiveContainer width='100%' height='100%'>
          <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: 20, bottom: 40 }}>
            <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#E2E8F0' />

            <XAxis dataKey='name' axisLine={false} tickLine={false} tick={<CustomXAxisTick />} interval={0} height={60} />
            {isNormalised ? (
              <>
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} domain={[0, normalisedDomainMax]} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} />
                <Legend payload={NORMALISED_LEGEND} align='right' verticalAlign='top' wrapperStyle={{ paddingBottom: '20px', fontWeight: 600, fontSize: '13px' }} />
                <ReferenceLine y={100} stroke='#64748B' strokeDasharray='6 4' label={{ value: 'Budget', position: 'insideTopLeft', fill: '#64748B', fontSize: 11, fontWeight: 600 }} />
                <Bar dataKey='Consumed (% of budget)' fill={CONSUMED_COLOR} maxBarSize={40} barSize={24} radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.isAtRisk ? AT_RISK_COLOR : CONSUMED_COLOR} />
                  ))}
                </Bar>
                <Bar dataKey='Progress (%)' fill={PROGRESS_COLOR} maxBarSize={40} barSize={24} radius={[4, 4, 0, 0]} />
              </>
            ) : (
              <>
                <YAxis yAxisId='left' axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12, fontWeight: 500 }} />
                <YAxis yAxisId='right' orientation='right' axisLine={false} tickLine={false} tickFormatter={(val) => `${val}%`} domain={[0, 'dataMax']} tick={{ fill: PROGRESS_COLOR, fontSize: 12, fontWeight: 700 }} />

                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }} />
                <Legend align='right' verticalAlign='top' iconType='circle' wrapperStyle={{ paddingBottom: '20px', fontWeight: 600, fontSize: '13px' }} />

                <Bar yAxisId='left' dataKey='Budget (hrs)' fill='#94A3B8' maxBarSize={40} barSize={24} radius={[4, 4, 0, 0]} />
                <Bar yAxisId='left' dataKey='Consumed (hrs)' fill={CONSUMED_COLOR} maxBarSize={40} barSize={24} radius={[4, 4, 0, 0]} />
                <Line yAxisId='right' type='monotone' dataKey='Progress (%)' stroke={PROGRESS_COLOR} strokeWidth={4} dot={{ r: 5, fill: '#fff', strokeWidth: 3 }} activeDot={{ r: 8 }} />
              </>
            )}
          </ComposedChart>
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
    return (
      <div className='bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 border border-slate-100 dark:border-slate-700 shadow-xl rounded-xl'>
        <p className='font-bold text-slate-800 dark:text-slate-100 mb-2 border-b border-slate-100 dark:border-slate-700 pb-2 truncate max-w-[250px]' title={label}>
          {label}
        </p>
        {payload.map((entry: any, index: number) => {
          const isPercent = entry.name === 'Progress (%)' || entry.name === 'Consumed (% of budget)';
          const val = isPercent ? `${entry.value.toFixed(1)}%` : entry.value.toFixed(1);
          const color = entry.name === 'Consumed (% of budget)' && entry.payload.isAtRisk ? AT_RISK_COLOR : entry.color;
          return (
            <div key={index} className='flex justify-between items-center gap-6 py-1 text-sm'>
              <span className='flex items-center gap-2'>
                <div className='w-3 h-3 rounded-full shadow-sm' style={{ backgroundColor: color }}></div>
                <span className='text-slate-600 dark:text-slate-300 font-medium'>{entry.name}</span>
              </span>
              <span className='font-bold text-slate-900 dark:text-slate-100'>{val}</span>
            </div>
          );
        })}
        {payload.some((entry: any) => entry.name === 'Consumed (% of budget)') && (
          <p className='mt-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400'>
            {payload[0].payload.consumed.toFixed(1)} / {payload[0].payload.budget.toFixed(1)} hrs
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default HoursConsumptionChart;
