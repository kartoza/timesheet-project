import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import 'gantt-task-react/dist/index.css';
import { Maximize2, Minimize2 } from 'lucide-react';
import { UI_PROJECT_KEYS } from '../../constants/pmo_dashboard';
import { UIProjectRow } from '../../types/pmo_dashboard';

type GanttViewProps = {
  data: UIProjectRow[];
  onViewDetails: (project: UIProjectRow) => void;
};

const CustomTooltip = ({ task, fontSize, fontFamily }: any) => {
  return (
    <div className='bg-white dark:bg-slate-800 p-3 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700' style={{ fontSize, fontFamily }}>
      <div className='font-bold text-slate-800 dark:text-slate-100 mb-1'>{task.name}</div>
      <div className='text-slate-600 dark:text-slate-400'>Progress: {Math.round(task.progress)}%</div>
      <div className='text-slate-500 dark:text-slate-500 text-xs mt-1'>
        {task.start.toLocaleDateString()} - {task.end.toLocaleDateString()}
      </div>
    </div>
  );
};

const COLUMN_WIDTH = 60;

const GanttView: React.FC<GanttViewProps> = ({ data, onViewDetails }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const tasks = useMemo<Task[]>(() => {
    return data.map((proj) => {
      let start = new Date(proj[UI_PROJECT_KEYS.START_DATE]);
      let end = new Date(proj[UI_PROJECT_KEYS.DUE_DATE]);

      if (Number.isNaN(start.getTime())) start = new Date();
      if (Number.isNaN(end.getTime())) {
        end = new Date(start);
        end.setDate(end.getDate() + 30);
      }

      if (start > end) {
        const temp = start;
        start = end;
        end = temp;
      }

      return {
        start,
        end,
        name: proj.Project,
        id: proj._id,
        progress: (proj[UI_PROJECT_KEYS.ACTUAL_PROGRESS] || 0) * 100,
        type: 'task',
        project: proj[UI_PROJECT_KEYS.BUSINESS_UNIT] || 'General',
        styles: {
          backgroundColor: '#64748b',
          backgroundSelectedColor: '#475569',
          progressColor: '#4f46e5',
          progressSelectedColor: '#4338ca',
        },
        isDisabled: false,
      };
    });
  }, [data]);

  useEffect(() => {
    if (!wrapperRef.current || tasks.length === 0) return;
    const minDate = new Date(Math.min(...tasks.map((t) => t.start.getTime())));
    const today = new Date();
    const monthsDiff =
      (today.getFullYear() - minDate.getFullYear()) * 12 +
      (today.getMonth() - minDate.getMonth());
    const scrollTarget = Math.max(0, (monthsDiff - 2) * COLUMN_WIDTH);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!wrapperRef.current) return;
        wrapperRef.current.querySelectorAll<HTMLElement>('*').forEach((el) => {
          const { overflowX } = window.getComputedStyle(el);
          if ((overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth) {
            el.scrollLeft = scrollTarget;
          }
        });
      });
    });
  }, [tasks]);

  if (tasks.length === 0) {
    return <div className='text-center py-10 text-slate-500 dark:text-slate-400'>No projects to display in Gantt View.</div>;
  }

  const handleTaskClick = (task: Task) => {
    const projectData = data.find((p) => p._id === task.id);
    if (projectData && onViewDetails) {
      onViewDetails(projectData);
    }
    return true;
  };

  return (
    <>
      {isFullscreen && (
        <div className='fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300' onClick={() => setIsFullscreen(false)} />
      )}
      <div ref={wrapperRef} className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm gantt-wrapper custom-scrollbar transition-all duration-300 flex flex-col ${isFullscreen ? 'fixed inset-4 z-[201] shadow-2xl' : 'relative overflow-x-auto overflow-y-hidden'}`}>
        <style>{`
          .dark .gantt-wrapper ._3_ygE,
          .dark .gantt-wrapper ._3ZbQT {
            border-color: #334155 !important;
            background-color: #0f172a !important;
          }

          .dark .gantt-wrapper ._34SS0:nth-of-type(even) {
            background-color: #1e293b !important;
          }

          .dark .gantt-wrapper ._2dZTy,
          .dark .gantt-wrapper ._2dZTy:nth-child(even) {
            fill: #1e293b !important;
          }

          .dark .gantt-wrapper ._3rUKi,
          .dark .gantt-wrapper ._RuwuK,
          .dark .gantt-wrapper ._1rLuZ,
          .dark .gantt-wrapper ._2eZzQ {
            stroke: #334155 !important;
            border-color: #334155 !important;
          }

          .dark .gantt-wrapper ._9w8d5,
          .dark .gantt-wrapper ._2q1Kt,
          .dark .gantt-wrapper ._3KcaM,
          .dark .gantt-wrapper ._2TfEi,
          .dark .gantt-wrapper ._2QjE6,
          .dark .gantt-wrapper ._3lLk3 {
            fill: #cbd5e1 !important;
            color: #cbd5e1 !important;
          }

          .dark .gantt-wrapper ._35nLX {
            fill: #334155 !important;
            stroke: #475569 !important;
          }
        `}</style>

        <div className='flex justify-end p-2 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700'>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className='flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-lg transition-colors'
          >
            {isFullscreen ? <><Minimize2 size={16} /> Exit Fullscreen</> : <><Maximize2 size={16} /> Fullscreen</>}
          </button>
        </div>

        <div className={isFullscreen ? 'flex-1 overflow-auto p-4' : ''}>
          <Gantt
            tasks={tasks}
            viewMode={ViewMode.Month}
            onClick={handleTaskClick}
            listCellWidth='180px'
            columnWidth={COLUMN_WIDTH}
            fontFamily="'Outfit', 'Inter', sans-serif"
            fontSize='12px'
            rowHeight={45}
            TooltipContent={CustomTooltip}
          />
        </div>
      </div>
    </>
  );
};

export default GanttView;
