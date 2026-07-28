import React from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

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
            <div className='relative z-10 flex justify-between items-start mb-6 shrink-0 border-b border-slate-100 dark:border-slate-800 pb-4'>
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
            <div className='flex-1 min-h-0 w-full relative overflow-hidden'>
              {children}
            </div>
          </div>
        </div>
      )}

      <div className='glass-card h-full p-6 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col'>
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
        <div className='h-[420px]'>
          {!isFullscreen && children}
        </div>
      </div>
    </>
  );
}

export default ChartCard;
