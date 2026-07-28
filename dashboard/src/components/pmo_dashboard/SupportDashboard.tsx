import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import ChartCard from './ChartCard';
import ContractTrackerTable from './ContractTrackerTable';
import IssuePriorityChart from './IssuePriorityChart';
import IssueSummaryTable from './IssueSummaryTable';
import SupportPrintView from './SupportPrintView';
import {
  fetchContracts,
  fetchIssueSummary,
  syncContracts,
  syncIssues,
  syncProjectsOnly,
} from '../../services/pmo_dashboard/api';
import { ApiContractTracker, IssueSummaryResponse } from '../../types/pmo_dashboard';
import { exportDashboardToPDF } from '../../utils/exportPDF';

const EMPTY_SUMMARY: IssueSummaryResponse = { all_time: [], last_sprint: [] };

type SupportDashboardProps = {
  onRegisterExport?: (fn: (() => Promise<void>) | null) => void;
};

const SupportDashboard: React.FC<SupportDashboardProps> = ({ onRegisterExport }) => {
  const [contracts, setContracts] = useState<ApiContractTracker[]>([]);
  const [visibleContracts, setVisibleContracts] = useState<ApiContractTracker[]>([]);
  const [issueSummary, setIssueSummary] = useState<IssueSummaryResponse>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');
  const [isRenderingPrintView, setIsRenderingPrintView] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [contractsData, summaryData] = await Promise.all([fetchContracts(), fetchIssueSummary()]);
      setContracts(contractsData);
      setIssueSummary(summaryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Support Dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleExportPDF = React.useCallback(async () => {
    const waitForRender = async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    };

    setIsRenderingPrintView(true);
    try {
      await waitForRender();
      if (!printRef.current) return;
      await exportDashboardToPDF(printRef.current, 'support-dashboard.pdf');
    } finally {
      setIsRenderingPrintView(false);
    }
  }, []);

  useEffect(() => {
    onRegisterExport?.(handleExportPDF);
    return () => onRegisterExport?.(null);
  }, [handleExportPDF, onRegisterExport]);

  const setUrlParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const qs = params.toString();
    history.pushState({}, '', qs ? `?${qs}` : window.location.pathname);
  };

  const setChartUrl = (id: string | null) => setUrlParam('chart', id);

  const handleChartFullscreen = (id: string, open: boolean) => {
    const next = open ? id : null;
    setFullscreenChart(next);
    setChartUrl(next);
  };

  useEffect(() => {
    const chartId = new URLSearchParams(window.location.search).get('chart');
    if (chartId) setFullscreenChart(chartId);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      setFullscreenChart(new URLSearchParams(window.location.search).get('chart'));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncProjectsOnly().catch((err) => {
        console.error('Project sync failed, continuing with contracts/issues sync', err);
      });
      const [contractsData, summaryData] = await Promise.all([syncContracts(), syncIssues()]);
      setContracts(contractsData);
      setIssueSummary(summaryData);
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
            title='Sync Contract Tracker and Issues from ERPNext'
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Contracts & Issues'}</span>
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
          <ContractTrackerTable data={contracts} onFilteredDataChange={setVisibleContracts} />

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <div className='space-y-6 self-start'>
              <ChartCard
                id='support-all-time-chart'
                title='Support Tickets (All Time)'
                subtitle='Per-customer breakdown, all time'
                isFullscreen={fullscreenChart === 'support-all-time-chart'}
                onFullscreenChange={(open) => handleChartFullscreen('support-all-time-chart', open)}
              >
                <IssuePriorityChart
                  data={issueSummary.all_time}
                  emptyMessage='No support ticket data yet. Try syncing from ERPNext.'
                />
              </ChartCard>
              <IssueSummaryTable
                title='Support Tickets (All Time)'
                data={issueSummary.all_time}
                emptyMessage='No support ticket data yet. Try syncing from ERPNext.'
              />
            </div>
            <div className='space-y-6 self-start'>
              <ChartCard
                id='support-last-sprint-chart'
                title='Tickets Current Sprint'
                subtitle='Per-customer breakdown, last completed sprint'
                isFullscreen={fullscreenChart === 'support-last-sprint-chart'}
                onFullscreenChange={(open) => handleChartFullscreen('support-last-sprint-chart', open)}
              >
                <IssuePriorityChart
                  data={issueSummary.last_sprint}
                  emptyMessage='No tickets opened in the last sprint.'
                />
              </ChartCard>
              <IssueSummaryTable
                title='Tickets Current Sprint'
                data={issueSummary.last_sprint}
                emptyMessage='No tickets opened in the current sprint.'
              />
            </div>
          </div>
        </div>
      )}

      {isRenderingPrintView && <SupportPrintView ref={printRef} contracts={visibleContracts} issueSummary={issueSummary} />}
    </div>
  );
};

export default SupportDashboard;
