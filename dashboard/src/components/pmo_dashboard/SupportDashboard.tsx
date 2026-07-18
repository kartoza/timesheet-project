import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import ContractTrackerTable from './ContractTrackerTable';
import { fetchContracts, syncContracts } from '../../services/pmo_dashboard/api';
import { ApiContractTracker } from '../../types/pmo_dashboard';

const SupportDashboard: React.FC = () => {
  const [contracts, setContracts] = useState<ApiContractTracker[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const contractsData = await fetchContracts();
      setContracts(contractsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Support Dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const contractsData = await syncContracts();
      setContracts(contractsData);
    } catch (err) {
      console.error('Support Dashboard sync failed', err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className='animate-in fade-in slide-in-from-bottom-4 duration-700'>
      <div className='flex flex-wrap items-center justify-between gap-4 mb-8'>
        <div className='flex items-center gap-4'>
          <h2 className='text-3xl font-bold text-slate-900 dark:text-slate-100'>Support Dashboard</h2>
          <button
            onClick={handleSync}
            disabled={isSyncing || isLoading}
            className='flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200 text-sm font-bold hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
            title='Sync Contract Tracker from ERPNext'
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Contracts'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className='mb-8 p-6 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900 shadow-sm flex gap-4 items-start'>
          <AlertCircle size={24} className='text-rose-600 shrink-0 mt-0.5' />
          <p className='text-rose-600 dark:text-rose-300 font-medium'>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className='flex items-center justify-center min-h-[40vh] text-slate-400 dark:text-slate-500 font-medium'>
          Loading Support Dashboard...
        </div>
      ) : (
        <div className='space-y-8'>
          <ContractTrackerTable data={contracts} />
        </div>
      )}
    </div>
  );
};

export default SupportDashboard;
