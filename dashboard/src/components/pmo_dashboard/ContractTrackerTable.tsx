import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { ApiContractTracker, ContractStatus } from '../../types/pmo_dashboard';
import DashboardFilters, { FilterFieldConfig } from './DashboardFilters';

type ContractTrackerTableProps = {
  data: ApiContractTracker[];
};

type SortKey = 'client' | 'project' | 'contract_type' | 'start_date' | 'end_date' | 'status';
type SortDir = 'asc' | 'desc';
type ContractFilterKey = 'client' | 'status' | 'contractType';

const STATUS_BADGE: Record<ContractStatus, { bg: string; text: string; dot: string }> = {
  'Open': { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  'Expires in 3 Months': { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  'Expires in 2 Months': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-400' },
  'Expires in 1 Month': { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500' },
  'Closed': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500 dark:text-slate-400', dot: 'bg-slate-400' },
};

const STATUS_ORDER: ContractStatus[] = ['Open', 'Expires in 3 Months', 'Expires in 2 Months', 'Expires in 1 Month', 'Closed'];
const DEFAULT_STATUS_FILTER: string[] = STATUS_ORDER.filter((s) => s !== 'Closed');

const fieldAccessors: Record<ContractFilterKey, (row: ApiContractTracker) => string> = {
  client: (row) => row.client ?? '',
  status: (row) => row.status,
  contractType: (row) => row.contract_type ?? '',
};

const ContractTrackerTable: React.FC<ContractTrackerTableProps> = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<ContractFilterKey, string[]>>({
    client: [],
    status: DEFAULT_STATUS_FILTER,
    contractType: [],
  });
  const [sortKey, setSortKey] = useState<SortKey>('end_date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const filterFields: FilterFieldConfig<ContractFilterKey>[] = useMemo(() => {
    const applyFiltersExcept = (excludeKey: ContractFilterKey) =>
      data.filter((row) => {
        for (const key of Object.keys(selectedFilters) as ContractFilterKey[]) {
          if (key === excludeKey) continue;
          const values = selectedFilters[key];
          if (values.length === 0) continue;
          if (!values.includes(fieldAccessors[key](row))) return false;
        }
        return true;
      });

    const toCounts = (rows: ApiContractTracker[], key: ContractFilterKey) => {
      const counts: Record<string, number> = {};
      rows.forEach((row) => {
        const value = fieldAccessors[key](row);
        if (value) counts[value] = (counts[value] || 0) + 1;
      });
      return counts;
    };

    const forClient = applyFiltersExcept('client');
    const forStatus = applyFiltersExcept('status');
    const forContractType = applyFiltersExcept('contractType');

    return [
      { key: 'client', label: 'Client', options: Array.from(new Set(forClient.map((r) => r.client).filter(Boolean))).sort() as string[], optionCounts: toCounts(forClient, 'client') },
      { key: 'status', label: 'Status', options: STATUS_ORDER.filter((s) => forStatus.some((r) => r.status === s)), optionCounts: toCounts(forStatus, 'status') },
      { key: 'contractType', label: 'Contract Type', options: Array.from(new Set(forContractType.map((r) => r.contract_type).filter(Boolean))).sort() as string[], optionCounts: toCounts(forContractType, 'contractType') },
    ];
  }, [data, selectedFilters]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = data.filter((row) => {
    for (const key of Object.keys(selectedFilters) as ContractFilterKey[]) {
      const values = selectedFilters[key];
      if (values.length === 0) continue;
      if (!values.includes(fieldAccessors[key](row))) return false;
    }
    if (searchTerm) {
      const haystack = `${row.client ?? ''} ${row.project} ${row.contact}`.toLowerCase();
      if (!haystack.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  const getSortValue = (row: ApiContractTracker, key: SortKey): string => {
    switch (key) {
      case 'client': return (row.client ?? '').toLowerCase();
      case 'project': return row.project.toLowerCase();
      case 'contract_type': return (row.contract_type ?? '').toLowerCase();
      case 'start_date': return row.start_date ?? '';
      case 'end_date': return row.end_date ?? '';
      case 'status': return row.status;
    }
  };

  const sorted = [...filtered].sort((a, b) => {
    const cmp = getSortValue(a, sortKey).localeCompare(getSortValue(b, sortKey));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronsUpDown size={12} className='opacity-40' />;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const Th = ({ col, label, className = '' }: { col: SortKey; label: string; className?: string }) => (
    <th
      className={`px-4 py-3 cursor-pointer select-none hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors ${className}`}
      onClick={() => handleSort(col)}
    >
      <span className='inline-flex items-center gap-1'>
        {label}
        <SortIcon col={col} />
      </span>
    </th>
  );

  return (
    <div className='space-y-4'>
      <DashboardFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedFilters={selectedFilters}
        setSelectedFilters={setSelectedFilters}
        filterFields={filterFields}
      />

      <div className='glass-card bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl overflow-hidden'>
        {sorted.length === 0 ? (
          <div className='p-10 text-center text-sm text-slate-400 dark:text-slate-500 font-medium'>
            No contracts match the current filters.
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='w-full text-left'>
              <thead className='bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[11px] uppercase font-bold border-b border-slate-200 dark:border-slate-700 tracking-wider'>
                <tr>
                  <Th col='client' label='Client' />
                  <Th col='project' label='Project' />
                  <Th col='contract_type' label='Contract Type' />
                  <Th col='start_date' label='Start Date' />
                  <Th col='end_date' label='End Date' />
                  <th className='px-4 py-3'>Contact</th>
                  <Th col='status' label='Status' />
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-100 dark:divide-slate-800'>
                {sorted.map((row) => {
                  const badge = STATUS_BADGE[row.status] ?? STATUS_BADGE.Open;
                  return (
                    <tr key={row.id} className='hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 transition-colors'>
                      <td className='px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 text-sm'>{row.client || '—'}</td>
                      <td className='px-4 py-3 text-slate-600 dark:text-slate-400 text-sm'>{row.project}</td>
                      <td className='px-4 py-3 text-slate-600 dark:text-slate-400 text-sm'>{row.contract_type || '—'}</td>
                      <td className='px-4 py-3 text-slate-600 dark:text-slate-400 text-sm'>{row.start_date || '—'}</td>
                      <td className='px-4 py-3 text-slate-600 dark:text-slate-400 text-sm'>{row.end_date || '—'}</td>
                      <td className='px-4 py-3 text-slate-600 dark:text-slate-400 text-sm'>{row.contact || '—'}</td>
                      <td className='px-4 py-3'>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${badge.bg} ${badge.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractTrackerTable;
