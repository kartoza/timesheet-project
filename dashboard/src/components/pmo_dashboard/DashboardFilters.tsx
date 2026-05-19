import React from 'react';
import { Filter, Search, Users } from 'lucide-react';

type DashboardFiltersProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  managerFilter: string;
  setManagerFilter: (value: string) => void;
  availableStatuses: string[];
  availableManagers: string[];
};

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  managerFilter,
  setManagerFilter,
  availableStatuses,
  availableManagers,
}) => {
  return (
    <div className='glass-card p-4 sm:p-5 mb-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl flex flex-col md:flex-row gap-4 items-center'>
      <div className='flex-1 w-full relative'>
        <Search size={18} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
        <input
          type='text'
          placeholder='Search projects...'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm text-slate-700'
        />
      </div>

      <div className='flex w-full md:w-auto gap-4'>
        <div className='relative flex-1 md:w-48'>
          <Filter size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className='w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm text-slate-700 appearance-none cursor-pointer'
          >
            <option value=''>All Statuses</option>
            {availableStatuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className='relative flex-1 md:w-48'>
          <Users size={16} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
          <select
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
            className='w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-sm text-slate-700 appearance-none cursor-pointer'
          >
            <option value=''>All Managers</option>
            {availableManagers.map((manager) => (
              <option key={manager} value={manager}>{manager}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters;
