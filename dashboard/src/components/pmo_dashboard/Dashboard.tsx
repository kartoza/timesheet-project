import React, { useRef, useMemo, useState } from 'react';
import {
  Banknote,
  Briefcase,
  CalendarDays,
  Clock,
  Maximize2,
  Minimize2,
  Table,
  TrendingUp,
} from 'lucide-react';
import PrintView from './PrintView';
import { exportDashboardToPDF } from '../../utils/exportPDF';
import { UI_PROJECT_KEYS } from '../../constants/pmo_dashboard';
import { CreateProjectPayload, UIProjectRow } from '../../types/pmo_dashboard';
import AddProjectModal from './AddProjectModal';
import AtRiskPanel from './AtRiskPanel';
import BillableHoursChart from './BillableHoursChart';
import DashboardFilters, { FilterFieldConfig, FilterFieldKey } from './DashboardFilters';
import EditableTable from './EditableTable';
import GanttView from './GanttView';
import HoursConsumptionChart from './HoursConsumptionChart';
import ManagerRevenueChart from './ManagerRevenueChart';
import ManagerWorkloadChart from './ManagerWorkloadChart';
import ProjectDetailsModal from './ProjectDetailsModal';
import SalesCostChart from './SalesCostChart';
import StatusChart from './StatusChart';

type DashboardProps = {
  data: UIProjectRow[];
  onUpdateDataRow: (id: string, field: string, value: string | number) => Promise<void>;
  onDeleteDataRow: (id: string) => Promise<void>;
  onAddManualProject: (projectData: CreateProjectPayload) => Promise<void>;
  pmOverloadThreshold: number;
  onRegisterExport?: (fn: () => Promise<void>) => void;
  onProjectDetailOpen?: (id: string) => Promise<UIProjectRow | null>;
};

const Dashboard: React.FC<DashboardProps> = ({
  data,
  onUpdateDataRow,
  onDeleteDataRow,
  onAddManualProject,
  pmOverloadThreshold,
  onRegisterExport,
  onProjectDetailOpen,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<Record<FilterFieldKey, string[]>>({
    projectType: ['External'],
    status: [],
    manager: [],
  });
  const [activeView, setActiveView] = useState<'table' | 'gantt'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProjectForDetails, setSelectedProjectForDetails] = useState<UIProjectRow | null>(null);
  const [detailSyncStatus, setDetailSyncStatus] = useState<'loading' | 'live' | null>(null);
  const [isRenderingPrintView, setIsRenderingPrintView] = useState(false);
  const [fullscreenChart, setFullscreenChart] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

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

  const setProjectUrl = (id: string | null) => setUrlParam('project', id);
  const setChartUrl = (id: string | null) => setUrlParam('chart', id);

  const handleChartFullscreen = (id: string, open: boolean) => {
    const next = open ? id : null;
    setFullscreenChart(next);
    setChartUrl(next);
  };

  // Open modal for project ID in URL once data is available
  React.useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('project');
    if (!id || !data.length) return;
    const project = data.find((p) => p._id === id);
    if (project && selectedProjectForDetails?._id !== id) {
      setSelectedProjectForDetails(project);
    }
  }, [data]);

  // Read chart fullscreen from URL on mount
  React.useEffect(() => {
    const chartId = new URLSearchParams(window.location.search).get('chart');
    if (chartId) setFullscreenChart(chartId);
  }, []);

  // Sync state with browser back/forward navigation
  React.useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const projectId = params.get('project');
      const chartId = params.get('chart');

      if (projectId) {
        const project = data.find((p) => p._id === projectId);
        if (project) { setDetailSyncStatus(null); setSelectedProjectForDetails(project); }
      } else {
        setSelectedProjectForDetails(null);
        setDetailSyncStatus(null);
      }

      setFullscreenChart(chartId);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [data]);

  const handleViewDetails = (project: UIProjectRow) => {
    setDetailSyncStatus(null);
    setSelectedProjectForDetails(project);
    setProjectUrl(project._id);
  };

  const handleRefreshProjectDetail = () => {
    if (!selectedProjectForDetails || !onProjectDetailOpen) return;
    setDetailSyncStatus('loading');
    onProjectDetailOpen(selectedProjectForDetails._id).then((fresh) => {
      if (fresh) setSelectedProjectForDetails(fresh);
      setDetailSyncStatus('live');
    });
  };

  const handleExportPDF = React.useCallback(async () => {
    const waitForRender = async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    };

    setIsRenderingPrintView(true);
    try {
      await waitForRender();
      if (!printRef.current) return;
      await exportDashboardToPDF(printRef.current);
    } finally {
      setIsRenderingPrintView(false);
    }
  }, []);

  React.useEffect(() => {
    onRegisterExport?.(handleExportPDF);
  }, [handleExportPDF, onRegisterExport]);

  const fieldAccessors: Record<FilterFieldKey, (row: UIProjectRow) => string> = {
    projectType: (row) => String(row[UI_PROJECT_KEYS.PROJECT_TYPE] || ''),
    status: (row) => String(row[UI_PROJECT_KEYS.STATUS] || ''),
    manager: (row) => String(row[UI_PROJECT_KEYS.PROJECT_MANAGER] || ''),
  };

  const filterFields: FilterFieldConfig[] = useMemo(() => {
    const applyFiltersExcept = (excludeKey: FilterFieldKey) =>
      data.filter((row) => {
        for (const key of Object.keys(selectedFilters) as FilterFieldKey[]) {
          if (key === excludeKey) continue;
          const values = selectedFilters[key];
          if (values.length === 0) continue;
          if (!values.includes(fieldAccessors[key](row))) return false;
        }
        return true;
      });

    const toOptions = (rows: UIProjectRow[], key: FilterFieldKey) =>
      Array.from(new Set(rows.map((d) => fieldAccessors[key](d)).filter(Boolean))).sort();

    const toCounts = (rows: UIProjectRow[], key: FilterFieldKey) => {
      const counts: Record<string, number> = {};
      rows.forEach((row) => {
        const value = fieldAccessors[key](row);
        if (value) counts[value] = (counts[value] || 0) + 1;
      });
      return counts;
    };

    const forProjectType = applyFiltersExcept('projectType');
    const forStatus = applyFiltersExcept('status');
    const forManager = applyFiltersExcept('manager');

    return [
      { key: 'projectType', label: 'Project Type', options: toOptions(forProjectType, 'projectType'), optionCounts: toCounts(forProjectType, 'projectType') },
      { key: 'status', label: 'Status', options: toOptions(forStatus, 'status'), optionCounts: toCounts(forStatus, 'status') },
      { key: 'manager', label: 'Manager', options: toOptions(forManager, 'manager'), optionCounts: toCounts(forManager, 'manager') },
    ];
  }, [data, selectedFilters]);

  const filteredData = useMemo(() => {
    return data.filter((d) => {
      let matchesSearch = true;
      let matchesFilters = true;

      if (searchTerm) {
        const projName = String(d.Project || '').toLowerCase();
        matchesSearch = projName.includes(searchTerm.toLowerCase());
      }

      const activeFilterKeys = Object.keys(selectedFilters) as FilterFieldKey[];
      for (const key of activeFilterKeys) {
        const selectedValues = selectedFilters[key];
        if (selectedValues.length === 0) {
          continue;
        }

        const fieldValue = fieldAccessors[key](d);
        if (!selectedValues.includes(fieldValue)) {
          matchesFilters = false;
          break;
        }
      }

      return matchesSearch && matchesFilters;
    });
  }, [data, searchTerm, selectedFilters]);

  const totalSales = filteredData.reduce((sum, row) => sum + (row[UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT] || 0), 0);
  const totalCost = filteredData.reduce((sum, row) => sum + (row[UI_PROJECT_KEYS.TOTAL_COSTING] || 0), 0);
  const totalBudgetHours = filteredData.reduce((sum, row) => sum + (row[UI_PROJECT_KEYS.BUDGET_HOURS] || 0), 0);
  const totalConsumedHours = filteredData.reduce((sum, row) => sum + (row[UI_PROJECT_KEYS.CONSUMED_TIME] || 0), 0);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 1 }).format(val);

  const profitMargin = totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0;

  const handleModalSave = (projectData: CreateProjectPayload) => {
    onAddManualProject(projectData);
    setSearchTerm('');
    setSelectedFilters({
      projectType: ['External'],
      status: [],
      manager: [],
    });
  };

  return (
    <div className='space-y-6'>
      <ProjectDetailsModal
        project={selectedProjectForDetails}
        detailSyncStatus={detailSyncStatus}
        onClose={() => { setSelectedProjectForDetails(null); setDetailSyncStatus(null); setProjectUrl(null); }}
        onRefresh={onProjectDetailOpen ? handleRefreshProjectDetail : undefined}
      />
      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleModalSave}
      />
      <div className='print:hidden'>
        <DashboardFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedFilters={selectedFilters}
          setSelectedFilters={setSelectedFilters}
          filterFields={filterFields}
        />
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6'>
        <MetricCard
          icon={<Briefcase size={24} className='text-slate-600' />}
          title='# of Projects'
          value={filteredData.length}
          bgColor='bg-slate-100'
          valueSize='text-3xl'
        />
        <MetricCard
          icon={<Banknote size={24} className='text-emerald-600' />}
          title='Total Sales'
          value={formatCurrency(totalSales)}
          bgColor='bg-emerald-50'
          valueSize='text-2xl'
        />
        <MetricCard
          icon={<Banknote size={24} className='text-rose-600' />}
          title='Total Cost'
          value={formatCurrency(totalCost)}
          bgColor='bg-rose-50'
          valueSize='text-2xl'
        />
        <MetricCard
          icon={<TrendingUp size={24} className='text-indigo-600' />}
          title='Avg Profit Margin'
          value={`${formatNumber(profitMargin)}%`}
          bgColor='bg-indigo-50'
          valueSize='text-2xl'
        />
        <MetricCard
          icon={<Clock size={24} className='text-amber-600' />}
          title='Hours Consumed'
          value={`${formatNumber(totalConsumedHours)} / ${formatNumber(totalBudgetHours)}`}
          bgColor='bg-amber-50'
          valueSize='text-lg'
        />
      </div>

      <AtRiskPanel
        data={filteredData}
        onViewDetails={(project) => handleViewDetails(project)}
      />

      {filteredData.length === 0 ? (
        <div className='py-12 text-center text-slate-500 dark:text-slate-400 font-medium'>
          No projects match your current filters.
        </div>
      ) : (
        <>
          <div className='mt-8 flex flex-col gap-4'>
            <div className='flex items-center justify-end'>
              <div className='bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur p-1 rounded-xl flex items-center border border-slate-200 dark:border-slate-700 shadow-sm inline-flex'>
                <button
                  onClick={() => setActiveView('table')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                    activeView === 'table'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <Table size={16} /> Table View
                </button>
                <button
                  onClick={() => setActiveView('gantt')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                    activeView === 'gantt'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  <CalendarDays size={16} /> Gantt View
                </button>
              </div>
            </div>

            {activeView === 'table' ? (
              <EditableTable
                data={filteredData}
                onUpdateDataRow={onUpdateDataRow}
                onDeleteDataRow={onDeleteDataRow}
                onAddProject={() => setIsModalOpen(true)}
                onViewDetails={(project) => handleViewDetails(project)}
              />
            ) : (
              <div className='glass-card mb-8 p-1'>
                <GanttView
                  data={filteredData}
                  onViewDetails={(project) => handleViewDetails(project)}
                />
              </div>
            )}
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8'>
            <ChartCard
              id='sales-cost'
              title='Sales vs. Cost Analysis'
              subtitle='Financial health overview per project'
              isFullscreen={fullscreenChart === 'sales-cost'}
              onFullscreenChange={(open) => handleChartFullscreen('sales-cost', open)}
            >
              <SalesCostChart data={filteredData} />
            </ChartCard>

            <ChartCard
              id='hours-consumption'
              title='Time Budget Consumption'
              subtitle='Hour utilization against actual completion rate'
              isFullscreen={fullscreenChart === 'hours-consumption'}
              onFullscreenChange={(open) => handleChartFullscreen('hours-consumption', open)}
            >
              <HoursConsumptionChart data={filteredData} />
            </ChartCard>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6'>
            <ChartCard
              id='portfolio-health'
              title='Kartoza Portfolio Health'
              subtitle='Status distribution of visible portfolio'
              isFullscreen={fullscreenChart === 'portfolio-health'}
              onFullscreenChange={(open) => handleChartFullscreen('portfolio-health', open)}
            >
              <StatusChart
                data={data}
                onStatusClick={(status) => {
                  setSelectedFilters((prev) => {
                    const hasStatus = prev.status.includes(status);
                    return {
                      ...prev,
                      status: hasStatus ? prev.status.filter((value) => value !== status) : [...prev.status, status],
                    };
                  });
                }}
              />
            </ChartCard>

            <ChartCard
              id='revenue-by-pm'
              title='Revenue by Project Manager'
              subtitle='Total sales grouped by Project Manager'
              isFullscreen={fullscreenChart === 'revenue-by-pm'}
              onFullscreenChange={(open) => handleChartFullscreen('revenue-by-pm', open)}
            >
              <ManagerRevenueChart data={filteredData} group_by='project_manager' />
            </ChartCard>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 mb-8'>
            <ChartCard
              id='pm-workload'
              title='Project Manager Workload Distribution'
              subtitle='Active projects and allocated budget hours per PM'
              isFullscreen={fullscreenChart === 'pm-workload'}
              onFullscreenChange={(open) => handleChartFullscreen('pm-workload', open)}
            >
              <ManagerWorkloadChart data={filteredData} overloadThreshold={pmOverloadThreshold} />
            </ChartCard>

            <ChartCard
              id='billable-efficiency'
              title='Billable Efficiency by Project'
              subtitle=''
              isFullscreen={fullscreenChart === 'billable-efficiency'}
              onFullscreenChange={(open) => handleChartFullscreen('billable-efficiency', open)}
            >
              <BillableHoursChart data={filteredData} />
            </ChartCard>
          </div>
          {isRenderingPrintView && <PrintView ref={printRef} filteredData={filteredData} />}
        </>
      )}
    </div>
  );
};

type MetricCardProps = {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  bgColor: string;
  valueSize: string;
};

function MetricCard({ icon, title, value, bgColor, valueSize }: MetricCardProps) {
  return (
    <div className='glass-card overflow-hidden p-5 border border-slate-100 shadow-lg shadow-slate-200/30 flex items-center gap-4 hover:-translate-y-1 transition-transform duration-300'>
      <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center ${bgColor}`}>
        {icon}
      </div>
      <div className='min-w-0'>
        <h4 className='text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider truncate'>{title}</h4>
        <div className={`font-bold text-slate-800 dark:text-slate-100 tracking-tight truncate ${valueSize}`}>{value}</div>
      </div>
    </div>
  );
}

type ChartCardProps = {
  id: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  isFullscreen: boolean;
  onFullscreenChange: (open: boolean) => void;
};

function ChartCard({ title, subtitle, children, isFullscreen, onFullscreenChange }: ChartCardProps) {
  return (
    <>
      {isFullscreen && (
        <div className='fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-slate-900 p-6 md:p-8 shadow-2xl rounded-2xl w-full h-full flex flex-col animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-700'>
            <div className='flex justify-between items-start mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-4'>
              <div>
                <h3 className='text-2xl font-bold text-slate-800 dark:text-white'>{title}</h3>
                <p className='text-base text-slate-500 dark:text-slate-400 font-medium mt-1'>{subtitle}</p>
              </div>
              <button
                onClick={() => onFullscreenChange(false)}
                className='p-3 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-colors'
                title='Exit Fullscreen'
              >
                <Minimize2 size={28} />
              </button>
            </div>
            <div className='flex-1 min-h-0 w-full relative'>
              {children}
            </div>
          </div>
        </div>
      )}

      <div className='glass-card p-6 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col'>
        <div className='flex justify-between items-start mb-6 shrink-0'>
          <div>
            <h3 className='text-lg font-bold text-slate-800 dark:text-white'>{title}</h3>
            <p className='text-sm text-slate-500 font-medium'>{subtitle}</p>
          </div>
          <button
            onClick={() => onFullscreenChange(true)}
            className='p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors print:hidden'
            title='Fullscreen'
          >
            <Maximize2 size={18} />
          </button>
        </div>
        <div className='h-[380px] min-h-[380px]'>
          {!isFullscreen && children}
        </div>
      </div>
    </>
  );
}

export default Dashboard;
