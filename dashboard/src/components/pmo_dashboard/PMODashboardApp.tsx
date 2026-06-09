import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Download,
  LogOut,
  Moon,
  RefreshCw,
  Server,
  Sun,
} from 'lucide-react';
import Dashboard from './Dashboard';
import { timeAgo } from '../../utils/pmo_dashboard';
import {
  createProject,
  deleteProject,
  fetchProjects,
  syncProjectDetail,
  syncProjects,
  updateProject,
} from '../../services/pmo_dashboard/api';
import { CreateProjectPayload, SessionUser, UIProjectRow } from '../../types/pmo_dashboard';
import '../../styles/pmo_dashboard/index.css';
import CircularMenu from '../Menu';

const PMODashboardApp: React.FC = () => {
  const [data, setData] = useState<UIProjectRow[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [user] = useState<SessionUser | null>({ username: 'dev-bypass' });
  const [pmOverloadThreshold] = useState(4);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('pmo_theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('pmo_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('pmo_theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (user) {
      loadDataFromAPI();
    } else {
      setData([]);
      setError('');
    }
  }, [user]);

  const loadDataFromAPI = async () => {
    setIsLoading(true);
    setError('');
    try {
      const projects = await fetchProjects();
      setData(projects);
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'Failed to connect to ERP Backend. Please verify API endpoints.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const projects = await syncProjects();
      setData(projects);
    } catch (err) {
      console.error('ERP sync failed', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    setData([]);
  };

  const updateDataRow = async (id: string, field: string, value: string | number) => {
    try {
      await updateProject(id, field, value);
      await loadDataFromAPI();
    } catch (err) {
      console.error('Failed to update remote project', err);
    }
  };

  const deleteDataRow = async (id: string) => {
    try {
      await deleteProject(id);
      setData((prev) => prev.filter((row) => row._id !== id));
    } catch (err) {
      console.error('Failed to delete remote project', err);
    }
  };

  const addManualProject = async (projectDetails: CreateProjectPayload) => {
    try {
      const createdProject = await createProject(projectDetails);
      setData((prev) => [...prev, createdProject]);
    } catch (err) {
      console.error('Failed to create remote project', err);
    }
  };

  const loadProjectDetail = async (id: string): Promise<UIProjectRow | null> => {
    try {
      const fresh = await syncProjectDetail(id);
      setData((prev) => prev.map((p) => (p._id === id ? fresh : p)));
      return fresh;
    } catch (err) {
      console.error('Failed to sync project detail', err);
      return null;
    }
  };

  const exportFnRef = useRef<(() => Promise<void>) | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!exportFnRef.current) return;
    setIsExporting(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 50)));
    try {
      await exportFnRef.current();
    } finally {
      setIsExporting(false);
    }
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const hasData = data.length > 0;

  return (
    <div className='min-h-screen transition-colors duration-300 bg-slate-50 dark:bg-slate-950'>
      <CircularMenu />
      <header className='bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-[100] px-4 md:px-8 py-4 shadow-sm transition-colors duration-300'>
        <div className='max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4'>
          <div className='flex items-center gap-4'>
            <div>
              <h1 className='text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-900 to-indigo-600 dark:from-indigo-400 dark:to-indigo-200 flex items-center gap-3'>
                <img src='/kartoza-logo.png' alt='Company Logo' className='h-8 w-auto object-contain' onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }} />
                PMO Executive Dashboard
              </h1>
              <p className='text-sm text-slate-500 dark:text-slate-400 font-medium mt-1'>Real-time Project Insights</p>
            </div>
          </div>

          <div className='flex items-center gap-3 md:gap-4 print:hidden'>
            {hasData && (
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className='flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 shadow-sm'
              >
                <Download size={18} />
                <span className='hidden sm:inline'>{isExporting ? 'Generating…' : 'Export PDF'}</span>
              </button>
            )}

            <button
              onClick={toggleTheme}
              className='p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-300 shadow-sm border border-slate-200 dark:border-slate-700'
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={20} className='text-amber-400' /> : <Moon size={20} className='text-indigo-600' />}
            </button>

<button
              onClick={handleLogout}
              className='p-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all duration-300'
              title='Logout'
            >
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </header>

      <main className='max-w-[95%] mx-auto px-6 py-8 relative'>
        {hasData && !isLoading && (
          <div className='hidden print:flex flex-col items-center mb-10 border-b-2 border-slate-200 pb-8 text-center pt-8'>
            <img src='/company-logo.png' alt='Company Logo' className='h-16 w-auto object-contain mb-4' onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }} />
            <h1 className='text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight'>PMO Executive Portfolio Report</h1>
            <p className='text-lg text-slate-500 dark:text-slate-400 font-medium mt-2'>Generated on: {new Date().toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}</p>
          </div>
        )}

        {isLoading && (
          <div className='flex flex-col items-center justify-center min-h-[60vh] max-w-3xl mx-auto'>
            <div className='flex flex-col items-center gap-6 animate-pulse'>
              <div className='w-24 h-24 bg-white/80 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center border-4 border-indigo-500/20'>
                <Server className='text-indigo-600 animate-bounce' size={40} />
              </div>
              <div className='text-center'>
                <h2 className='text-2xl font-bold text-slate-800 dark:text-slate-100'>Connecting to ERPNext...</h2>
                <p className='text-slate-500 dark:text-slate-400 mt-2 font-medium'>Fetching live project portfolios via Data Service API</p>
              </div>
            </div>
          </div>
        )}

        {!isLoading && error && (
          <div className='mb-8 p-6 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900 shadow-sm flex gap-4 items-start max-w-3xl mx-auto'>
            <AlertCircle size={28} className='text-rose-600 shrink-0 mt-1' />
            <div>
              <h3 className='font-bold text-rose-800 dark:text-rose-200 text-lg mb-1'>Connection Failed</h3>
              <p className='text-rose-600 dark:text-rose-300 font-medium'>{error}</p>
            </div>
          </div>
        )}

        {hasData && (
          <div className='animate-in fade-in slide-in-from-bottom-4 duration-700'>
            <div className='flex flex-wrap items-center justify-between gap-4 mb-8 print:hidden'>
              <div className='flex items-center gap-4'>
                <h2 className='text-3xl font-bold text-slate-900 dark:text-slate-100'>Portfolio Overview</h2>
                <div className='flex items-center gap-2 mt-1'>
                  <button
                    onClick={handleSyncAll}
                    disabled={isSyncing}
                    className='flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200 text-sm font-bold hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors'
                    title='Refresh all projects from ERPNext'
                  >
                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                    <span>{isSyncing ? 'Syncing...' : 'Refresh from ERPNext'}</span>
                  </button>
                  {(() => {
                    const latest = data.reduce<string | null>((acc, p) => {
                      if (!p._lastSyncedAt) return acc;
                      return !acc || p._lastSyncedAt > acc ? p._lastSyncedAt : acc;
                    }, null);
                    return latest ? (
                      <span className='text-xs text-slate-400 font-medium'>
                        Last synced: {timeAgo(latest)}
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>
            </div>

            <Dashboard
              data={data}
              onUpdateDataRow={updateDataRow}
              onDeleteDataRow={deleteDataRow}
              onAddManualProject={addManualProject}
              pmOverloadThreshold={pmOverloadThreshold}
              onRegisterExport={(fn) => { exportFnRef.current = fn; }}
              onProjectDetailOpen={loadProjectDetail}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default PMODashboardApp;
