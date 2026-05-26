import React from 'react';
import { Building2, Calendar, Clock, ListChecks, User, Users, X } from 'lucide-react';
import { UI_PROJECT_KEYS } from '../../constants/pmo_dashboard';
import { UIProjectRow } from '../../types/pmo_dashboard';
import { formatManagerName } from '../../utils/pmo_dashboard';

type ProjectDetailsModalProps = {
  project: UIProjectRow | null;
  onClose: () => void;
};

const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({ project, onClose }) => {
  if (!project) return null;

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(val || 0);

  const startDate = project[UI_PROJECT_KEYS.START_DATE];
  const dueDate = project[UI_PROJECT_KEYS.DUE_DATE];

  const toUtcStartOfDay = (value: string | Date): number => {
    const date = new Date(value);
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  };

  const getSchedulePercent = (): number | null => {
    if (!startDate || !dueDate) return null;

    const start = toUtcStartOfDay(startDate);
    const end = toUtcStartOfDay(dueDate);

    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;

    const now = toUtcStartOfDay(new Date());
    const total = end - start;
    const elapsed = now - start;

    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  const schedulePercent = getSchedulePercent();

  return (
    <div onClick={onClose} className='fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200'>
      <div onClick={(e) => e.stopPropagation()} className='bg-white dark:bg-slate-900 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-200 dark:border-slate-700'>
        <div className='px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-800/50'>
          <div>
            <div className='flex items-center gap-2 mb-2'>
              <span className='text-xs font-bold px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-md border border-indigo-200 dark:border-indigo-800 flex items-center gap-1'>
                <Building2 size={12} /> {project[UI_PROJECT_KEYS.BUSINESS_UNIT] || 'General'}
              </span>
              <span className='text-xs font-bold px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-md'>
                {project.Status}
              </span>
            </div>
            <h2 className='text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight'>{project.Project}</h2>
          </div>
          <button
            onClick={onClose}
            className='p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors shrink-0'
            title='Close'
          >
            <X size={24} />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto p-6 space-y-8'>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div className='p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm'>
              <div className='text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1 flex items-center gap-1.5'><Calendar size={14} /> Start Date</div>
              <div className='font-extrabold text-slate-800 dark:text-white'>{project[UI_PROJECT_KEYS.START_DATE] || 'N/A'}</div>
            </div>
            <div className='p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm'>
              <div className='text-slate-500 dark:text-slate-400 text-xs font-bold uppercase mb-1 flex items-center gap-1.5'><Calendar size={14} /> Expected End</div>
              <div className='font-extrabold text-slate-800 dark:text-white'>{project[UI_PROJECT_KEYS.DUE_DATE] || 'N/A'}</div>
            </div>
            <div className='p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50 shadow-sm'>
              <div className='text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase mb-1'>Total Sales</div>
              <div className='font-extrabold text-emerald-900 dark:text-emerald-100'>{formatCurrency(project[UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT])}</div>
            </div>
            <div className='p-4 bg-rose-50 dark:bg-rose-900/20 rounded-xl border border-rose-100 dark:border-rose-800/50 shadow-sm'>
              <div className='text-rose-700 dark:text-rose-400 text-xs font-bold uppercase mb-1'>Total Costing</div>
              <div className='font-extrabold text-rose-900 dark:text-rose-100'>{formatCurrency(project[UI_PROJECT_KEYS.TOTAL_COSTING])}</div>
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/50 rounded-2xl shadow-sm'>
            <div>
              <h3 className='text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2'>
                <User size={14} className='text-indigo-600 dark:text-indigo-400' /> Project Manager
              </h3>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm border border-indigo-200 dark:border-indigo-700'>
                  {formatManagerName(project[UI_PROJECT_KEYS.PROJECT_MANAGER] || '').split(' ').map((name) => name[0]).join('') || 'PM'}
                </div>
                <div>
                  <div className='font-bold text-slate-800 dark:text-white'>{formatManagerName(project[UI_PROJECT_KEYS.PROJECT_MANAGER] || '') || 'Not Assigned'}</div>
                  <div className='text-xs text-slate-500 dark:text-slate-400 font-medium'>Lead Project Manager</div>
                </div>
              </div>
            </div>
            <div>
              <h3 className='text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2'>
                <Users size={14} className='text-indigo-600 dark:text-indigo-400' /> Team Members
              </h3>
              <div className='flex flex-wrap gap-2'>
                {project[UI_PROJECT_KEYS.TEAM_MEMBERS]?.map((member, i) => (
                  <span key={`${member}-${i}`} className='px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5'>
                    <div className='w-1.5 h-1.5 rounded-full bg-emerald-500'></div>
                    {formatManagerName(member)}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {schedulePercent !== null && (
            <div className='p-5 bg-indigo-50/30 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 rounded-2xl shadow-sm'>
              <div className='flex justify-between items-center mb-3'>
                <h3 className='text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2'>
                  <Clock size={16} className='text-indigo-600 dark:text-indigo-400' /> Schedule Progress
                </h3>
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${schedulePercent > 90 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'}`}>
                  {schedulePercent.toFixed(0)}% Elapsed
                </span>
              </div>

              <div className='relative h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden'>
                <div
                  className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out rounded-full ${schedulePercent > 90 ? 'bg-rose-500' : 'bg-indigo-600 dark:bg-indigo-500'}`}
                  style={{ width: `${schedulePercent}%` }}
                />
              </div>

              <div className='flex justify-between mt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter'>
                <span>Kickoff</span>
                <span>Current Milestone</span>
                <span>Deadline</span>
              </div>
            </div>
          )}

          <div>
            <h3 className='text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2'>
              <ListChecks size={20} className='text-indigo-600 dark:text-indigo-400' /> Component SubTasks
            </h3>

            {project.SubTasks && project.SubTasks.length > 0 ? (
              <div className='border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm'>
                <table className='w-full text-left'>
                  <thead className='bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold border-b border-slate-200 dark:border-slate-700 tracking-wider'>
                    <tr>
                      <th className='px-4 py-3'>Task Name</th>
                      <th className='px-4 py-3 text-right'>Budget (Hrs)</th>
                      <th className='px-4 py-3 text-right'>Consumed</th>
                      <th className='px-4 py-3 text-right'>Billable</th>
                      <th className='px-4 py-3 text-right'>Burn Rate</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900'>
                    {project.SubTasks.map((task) => {
                      const budget = task.budgetTime || 0;
                      const consumed = task.consumedTime || 0;
                      const burn = budget > 0 ? (consumed / budget) * 100 : 0;

                      return (
                        <tr key={task.id} className='hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 transition-colors'>
                          <td className='px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 text-sm'>{task.name}</td>
                          <td className='px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400 text-sm'>{task.budgetTime}h</td>
                          <td className='px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400 text-sm'>{task.consumedTime}h</td>
                          <td className='px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-200 text-sm'>{task.billableHours || 0}h</td>
                          <td className='px-4 py-3 text-right'>
                            <span className={`inline-block px-2 py-1 rounded-md text-[10px] font-bold ${burn > 100 ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' : burn > 85 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'}`}>
                              {burn.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className='p-8 text-center bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-700 border-dashed rounded-xl flex flex-col items-center justify-center gap-3'>
                <ListChecks size={32} className='text-slate-300 dark:text-slate-600' />
                <div>
                  <p className='text-slate-600 dark:text-slate-400 font-bold'>No SubTasks Recorded</p>
                  <p className='text-slate-400 dark:text-slate-500 text-sm mt-1'>This project does not currently contain detailed component breakdown.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetailsModal;
