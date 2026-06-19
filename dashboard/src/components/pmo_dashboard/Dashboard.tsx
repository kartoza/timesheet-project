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
  const printRef = useRef<HTMLDivElement>(null);

  const handleViewDetails = (project: UIProjectRow) => {
    setDetailSyncStatus(null);
    setSelectedProjectForDetails(project);
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

  const availableStatuses = useMemo(() => {
    const statuses = new Set(data.map((d) => d.Status).filter(Boolean));
    return Array.from(statuses).sort();
  }, [data]);

  const availableProjectTypes = useMemo(() => {
    const projectTypes = new Set(data.map((d) => d[UI_PROJECT_KEYS.PROJECT_TYPE]).filter(Boolean));
    return Array.from(projectTypes).sort();
  }, [data]);

  const availableManagers = useMemo(() => {
    const managers = new Set(data.map((d) => d[UI_PROJECT_KEYS.RELATIONSHIP_MANAGER]).filter(Boolean));
    return Array.from(managers).sort();
  }, [data]);

  const fieldAccessors: Record<FilterFieldKey, (row: UIProjectRow) => string> = {
    projectType: (row) => String(row[UI_PROJECT_KEYS.PROJECT_TYPE] || ''),
    status: (row) => String(row[UI_PROJECT_KEYS.STATUS] || ''),
    manager: (row) => String(row[UI_PROJECT_KEYS.RELATIONSHIP_MANAGER] || ''),
  };

  const getOptionCounts = (key: FilterFieldKey): Record<string, number> => {
    const counts: Record<string, number> = {};
    data.forEach((row) => {
      const value = fieldAccessors[key](row);
      if (!value) return;
      counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
  };

  const filterFields: FilterFieldConfig[] = useMemo(
    () => [
      {
        key: 'projectType',
        label: 'Project Type',
        options: availableProjectTypes,
        optionCounts: getOptionCounts('projectType'),
      },
      {
        key: 'status',
        label: 'Status',
        options: availableStatuses,
        optionCounts: getOptionCounts('status'),
      },
      {
        key: 'manager',
        label: 'Manager',
        options: availableManagers,
        optionCounts: getOptionCounts('manager'),
      },
    ],
    [availableProjectTypes, availableStatuses, availableManagers, data]
  );

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
      projectType: [],
      status: [],
      manager: [],
    });
  };

  return (
    <div className='space-y-6'>
      <ProjectDetailsModal
        project={selectedProjectForDetails}
        detailSyncStatus={detailSyncStatus}
        onClose={() => { setSelectedProjectForDetails(null); setDetailSyncStatus(null); }}
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
        <div className='py-12 text-center text-slate-500 font-medium'>
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
              title='Sales vs. Cost Analysis'
              subtitle='Financial health overview per project'
            >
              <SalesCostChart data={filteredData} />
            </ChartCard>

            <ChartCard
              title='Time Budget Consumption'
              subtitle='Hour utilization against actual completion rate'
            >
              <HoursConsumptionChart data={filteredData} />
            </ChartCard>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6'>
            <ChartCard
              title='Kartoza Portfolio Health'
              subtitle='Status distribution of visible portfolio'
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
              title='Revenue by Project Manager'
              subtitle='Total sales grouped by Project Manager'
            >
              <ManagerRevenueChart data={filteredData} group_by='project_manager' />
            </ChartCard>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 mb-8'>
            <ChartCard
              title='Project Manager Workload Distribution'
              subtitle='Active projects and allocated budget hours per PM'
            >
              <ManagerWorkloadChart data={filteredData} overloadThreshold={pmOverloadThreshold} />
            </ChartCard>

            <ChartCard
              title='Billable Efficiency by Project'
              subtitle=''
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
        <h4 className='text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider truncate'>{title}</h4>
        <div className={`font-bold text-slate-800 tracking-tight truncate ${valueSize}`}>{value}</div>
      </div>
    </div>
  );
}

type ChartCardProps = {
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

function ChartCard({ title, subtitle, children }: ChartCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <>
      {isFullscreen && (
        <div className='fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-slate-900 p-6 md:p-8 shadow-2xl rounded-2xl w-full h-full flex flex-col animate-in zoom-in-95 duration-200 border border-transparent dark:border-slate-700'>
            <div className='flex justify-between items-start mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-4'>
              <div>
                <h3 className='text-2xl font-bold text-slate-800 dark:text-white'>{title}</h3>
                <p className='text-base text-slate-500 font-medium mt-1'>{subtitle}</p>
              </div>
              <button
                onClick={() => setIsFullscreen(false)}
                className='p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors'
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
            onClick={() => setIsFullscreen(true)}
            className='p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors print:hidden'
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
