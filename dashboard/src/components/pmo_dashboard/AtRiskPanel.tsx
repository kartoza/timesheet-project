import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import { AT_RISK_STATUS_KEYS, UI_PROJECT_KEYS } from '../../constants/pmo_dashboard';
import { UIProjectRow } from '../../types/pmo_dashboard';

type AtRiskPanelProps = {
  data: UIProjectRow[];
  onViewDetails: (project: UIProjectRow) => void;
};

const AtRiskPanel: React.FC<AtRiskPanelProps> = ({ data, onViewDetails }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const atRiskProjects = useMemo(
    () => data.filter((proj) => AT_RISK_STATUS_KEYS.has(proj._statusKey || '')),
    [data],
  );

  if (atRiskProjects.length === 0) {
    return (
      <div className='mt-8 p-4 bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-2xl flex items-center justify-between'>
        <div className='flex items-center gap-3 text-emerald-700 dark:text-emerald-400'>
          <ShieldCheck size={20} />
          <span className='font-bold text-sm'>Portfolio Health Excellent: No projects currently require immediate attention.</span>
        </div>
      </div>
    );
  }

  if (!isExpanded) {
    return (
      <div className='mt-8 flex justify-center'>
        <button
          onClick={() => setIsExpanded(true)}
          className='group flex items-center gap-3 px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-rose-300 dark:hover:border-rose-700 rounded-full transition-all duration-300 animate-in fade-in zoom-in-95'
        >
          <div className='w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-sm border border-rose-200 dark:border-rose-800'>
            {atRiskProjects.length}
          </div>
          <span className='font-bold text-slate-700 dark:text-slate-300 text-sm'>Action Items Available</span>
          <ChevronDown size={18} className='text-slate-400 group-hover:text-rose-500 transition-colors' />
        </button>
      </div>
    );
  }

  return (
    <div className='mt-8 glass-card border border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-900/10 rounded-2xl overflow-hidden shadow-sm shadow-rose-100/50 dark:shadow-none animate-in fade-in slide-in-from-top-4 duration-300'>
      <div className='bg-rose-100/50 dark:bg-rose-900/30 px-5 py-3 border-b border-rose-200 dark:border-rose-800/50 flex items-center justify-between cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors' onClick={() => setIsExpanded(false)}>
        <div className='flex items-center gap-2'>
          <AlertTriangle size={18} className='text-rose-600 dark:text-rose-400' />
          <h3 className='font-extrabold text-rose-800 dark:text-rose-300 text-sm tracking-wide uppercase'>Action Required: At-Risk Projects ({atRiskProjects.length})</h3>
        </div>
        <button className='text-rose-600 dark:text-rose-400 p-1 hover:bg-rose-200 dark:hover:bg-rose-800/50 rounded-lg transition-colors'>
          <ChevronUp size={20} />
        </button>
      </div>

      <div className='p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        {atRiskProjects.map((proj) => (
          <div
            key={proj._id}
            className='bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md hover:border-rose-300 dark:hover:border-rose-700 transition-all cursor-pointer flex flex-col group'
            onClick={() => onViewDetails(proj)}
          >
            <div className='flex justify-between items-start mb-2'>
              <h4 className='font-bold text-slate-800 dark:text-white truncate pr-2' title={proj.Project}>{proj.Project}</h4>
              <span className='shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 inline-flex items-center justify-center leading-none text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600' title={proj[UI_PROJECT_KEYS.PROJECT_MANAGER]}>
                {proj[UI_PROJECT_KEYS.PROJECT_MANAGER]?.split(' ').map((name) => name[0]).join('') || 'PM'}
              </span>
            </div>

            <div className='flex-1 flex flex-wrap gap-1.5 mb-4'>
              {(proj._statusReasons || []).map((reason, idx) => (
                <div key={`${proj._id}-${idx}`} className='flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-md w-fit'>
                  <AlertTriangle size={12} /> {reason}
                </div>
              ))}
            </div>

            <div className='flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-slate-700'>
              <span className='text-xs font-medium text-slate-500 dark:text-slate-400'>
                Due: <span className='font-bold text-slate-700 dark:text-slate-300'>{proj[UI_PROJECT_KEYS.DUE_DATE] || 'N/A'}</span>
              </span>
              <div className='text-indigo-600 dark:text-indigo-400 flex items-center gap-1 text-xs font-bold group-hover:translate-x-1 transition-transform'>
                View Details <ArrowRight size={14} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AtRiskPanel;
