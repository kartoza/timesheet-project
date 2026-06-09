import React from 'react';
import { ChevronDown, ChevronRight, Filter, Search, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export type FilterFieldKey = 'projectType' | 'status' | 'manager';

export type FilterFieldConfig = {
  key: FilterFieldKey;
  label: string;
  options: string[];
  optionCounts?: Record<string, number>;
};

type SelectedFilters = Record<FilterFieldKey, string[]>;

type DashboardFiltersProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedFilters: SelectedFilters;
  setSelectedFilters: React.Dispatch<React.SetStateAction<SelectedFilters>>;
  filterFields: FilterFieldConfig[];
};

const DashboardFilters: React.FC<DashboardFiltersProps> = ({
  searchTerm,
  setSearchTerm,
  selectedFilters,
  setSelectedFilters,
  filterFields,
}) => {
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);
  const [expandedSections, setExpandedSections] = React.useState<Record<FilterFieldKey, boolean>>({
    projectType: false,
    status: false,
    manager: false,
  });
  const [panelPosition, setPanelPosition] = React.useState({ top: 0, left: 0, width: 320 });
  const triggerRef = React.useRef<HTMLDivElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  const updatePanelPosition = React.useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelWidth = Math.min(320, window.innerWidth - 24);
    const left = Math.max(12, rect.right - panelWidth);
    const top = rect.bottom + 8;
    setPanelPosition({ top, left, width: panelWidth });
  }, []);

  React.useEffect(() => {
    if (!isPanelOpen) return;

    updatePanelPosition();

    const handleViewportChange = () => updatePanelPosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isPanelOpen, updatePanelPosition]);

  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsidePanel = panelRef.current?.contains(target);
      const clickedOnTrigger = triggerRef.current?.contains(target);

      if (!clickedInsidePanel && !clickedOnTrigger) {
        setIsPanelOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPanelOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const toggleValue = (field: FilterFieldKey, value: string) => {
    setSelectedFilters((prev) => {
      const values = prev[field];
      const hasValue = values.includes(value);
      return {
        ...prev,
        [field]: hasValue ? values.filter((item) => item !== value) : [...values, value],
      };
    });
  };

  const clearField = (field: FilterFieldKey) => {
    setSelectedFilters((prev) => ({ ...prev, [field]: [] }));
  };

  const clearAll = () => {
    setSelectedFilters({
      projectType: [],
      status: [],
      manager: [],
    });
  };

  const toggleSection = (field: FilterFieldKey) => {
    setExpandedSections((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const totalActive = Object.values(selectedFilters).reduce((sum, values) => sum + values.length, 0);

  const activeChips = filterFields.flatMap((field) =>
    selectedFilters[field.key].map((value) => ({ field: field.key, label: field.label, value }))
  );

  const renderMenuContent = () => (
    <>
      <div className='max-h-80 overflow-y-auto space-y-1 custom-scrollbar'>
        {filterFields.map((field) => {
          const selectedCount = selectedFilters[field.key].length;
          const isExpanded = expandedSections[field.key];
          const optionCounts = field.optionCounts || {};

          return (
            <div key={field.key} className='rounded-lg border border-slate-100 dark:border-slate-700'>
              <div className='flex items-center justify-between px-2 py-1'>
                <button
                  onClick={() => toggleSection(field.key)}
                  className='w-full flex items-center justify-between px-1 py-1.5 rounded text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors'
                >
                  <span className='inline-flex items-center gap-2'>
                    {isExpanded ? <ChevronDown size={15} className='text-slate-400 dark:text-slate-500' /> : <ChevronRight size={15} className='text-slate-400 dark:text-slate-500' />}
                    <span className='font-medium'>{field.label}</span>
                  </span>
                  {selectedCount > 0 && (
                      <span className='text-xs px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-semibold'>
                      {selectedCount}
                    </span>
                  )}
                </button>

                {selectedCount > 0 && (
                  <button
                    onClick={() => clearField(field.key)}
                    className='ml-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors'
                  >
                    Clear
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className='px-3 pb-2 pt-1 space-y-1'>
                  {field.options.length === 0 ? (
                    <div className='text-sm text-slate-400 dark:text-slate-500 py-1'>No values available</div>
                  ) : (
                    field.options.map((option) => {
                      const checked = selectedFilters[field.key].includes(option);
                      const count = optionCounts[option] || 0;
                      return (
                        <label key={option} className='flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 px-1 py-1 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50'>
                          <input
                            type='checkbox'
                            checked={checked}
                            onChange={() => toggleValue(field.key, option)}
                            className='h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500'
                          />
                          <span>{option}</span>
                          <span className='text-slate-400 dark:text-slate-500'>({count})</span>
                        </label>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className='border-t border-slate-100 dark:border-slate-700 mt-2 pt-2 px-2'>
        <button
          onClick={clearAll}
          className='text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors'
        >
          Clear all
        </button>
      </div>
    </>
  );

  return (
    <div className='glass-card p-4 sm:p-5 mb-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-2xl flex flex-col gap-4'>
      <div className='flex flex-col md:flex-row gap-4 items-center'>
        <div className='flex-1 w-full relative'>
          <Search size={18} className='absolute left-3 top-1/2 -translate-y-1/2 text-slate-400' />
          <input
            type='text'
            placeholder='Search projects...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/40 transition-all text-sm text-slate-700 dark:text-slate-200'
          />
        </div>

        <div ref={triggerRef} className='w-full md:w-auto'>
          <button
            onClick={() => {
              setIsPanelOpen((prev) => {
                if (prev) {
                } else {
                  updatePanelPosition();
                }
                return !prev;
              });
            }}
            className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${
              isPanelOpen || totalActive > 0
                ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70'
            }`}
          >
            <Filter size={16} />
            <span>{totalActive > 0 ? `+ Filters (${totalActive})` : '+ Filters'}</span>
          </button>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className='flex flex-wrap items-center gap-2'>
          {activeChips.map((chip) => (
            <span key={`${chip.field}-${chip.value}`} className='inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200'>
              <span className='font-medium'>{chip.label}:</span>
              <span>{chip.value}</span>
              <button onClick={() => toggleValue(chip.field, chip.value)} className='text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-300 transition-colors'>
                <X size={14} />
              </button>
            </span>
          ))}

          <button onClick={clearAll} className='text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors'>
            Clear all
          </button>
        </div>
      )}

      {isPanelOpen && createPortal(
        <div
          ref={panelRef}
          className='fixed z-[300] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 shadow-lg'
          style={{ top: panelPosition.top, left: panelPosition.left, width: panelPosition.width }}
        >
          {renderMenuContent()}
        </div>,
        document.body
      )}
    </div>
  );
};

export default DashboardFilters;
