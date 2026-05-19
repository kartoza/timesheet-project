import React, { FormEvent, useState } from 'react';
import { Building, Save, X } from 'lucide-react';
import { UI_PROJECT_KEYS } from '../../constants/pmo_dashboard';
import { CreateProjectPayload } from '../../types/pmo_dashboard';

const STATUS_OPTIONS = ['🟢 On track', '🟡 Delayed', '🔴 At risk', '🟣 Completed', '⚪ On Hold', '⚫ Cancelled'];

type AddProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: CreateProjectPayload) => void;
};

const AddProjectModal: React.FC<AddProjectModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<CreateProjectPayload>({
    [UI_PROJECT_KEYS.PROJECT]: '',
    [UI_PROJECT_KEYS.RELATIONSHIP_MANAGER]: '',
    [UI_PROJECT_KEYS.DUE_DATE]: '',
    [UI_PROJECT_KEYS.STATUS]: '🟢 On track',
    [UI_PROJECT_KEYS.BUDGET_HOURS]: 0,
    [UI_PROJECT_KEYS.CONSUMED_TIME]: 0,
    [UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT]: 0,
    [UI_PROJECT_KEYS.TOTAL_COSTING]: 0,
    [UI_PROJECT_KEYS.ACTUAL_PROGRESS]: 0,
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : 0) : value,
    }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData[UI_PROJECT_KEYS.PROJECT].trim()) return;
    onSave(formData);
    onClose();
  };

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200'>
      <div className='bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200'>
        <div className='px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50'>
          <h2 className='text-xl font-bold flex items-center gap-2 text-slate-800'>
            <Building className='text-indigo-600' size={24} /> Create New Project
          </h2>
          <button
            onClick={onClose}
            className='text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-lg hover:bg-rose-50'
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='p-6'>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div className='md:col-span-2 space-y-1'>
              <label className='text-xs font-bold text-slate-500 uppercase'>Project Name *</label>
              <input
                required
                type='text'
                name={UI_PROJECT_KEYS.PROJECT}
                value={formData[UI_PROJECT_KEYS.PROJECT]}
                onChange={handleChange}
                placeholder='Enter official project title'
                className='w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all font-medium text-slate-800'
              />
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-bold text-slate-500 uppercase'>Relationship Manager</label>
                <input
                  type='text'
                  name={UI_PROJECT_KEYS.RELATIONSHIP_MANAGER}
                  value={formData[UI_PROJECT_KEYS.RELATIONSHIP_MANAGER]}
                  onChange={handleChange}
                  placeholder='e.g. John Doe'
                className='w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-700'
              />
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-bold text-slate-500 uppercase'>Due Date</label>
                <input
                  type='date'
                  name={UI_PROJECT_KEYS.DUE_DATE}
                  value={formData[UI_PROJECT_KEYS.DUE_DATE]}
                  onChange={handleChange}
                className='w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-700'
              />
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-bold text-slate-500 uppercase'>Status</label>
              <select
                name={UI_PROJECT_KEYS.STATUS}
                value={formData[UI_PROJECT_KEYS.STATUS]}
                onChange={handleChange}
                className='w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-700'
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-bold text-slate-500 uppercase'>Budget (Hours)</label>
                <input
                  type='number'
                  name={UI_PROJECT_KEYS.BUDGET_HOURS}
                  value={formData[UI_PROJECT_KEYS.BUDGET_HOURS]}
                  onChange={handleChange}
                className='w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-700'
              />
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-bold text-slate-500 uppercase'>Consumed Time (Hours)</label>
                <input
                  type='number'
                  name={UI_PROJECT_KEYS.CONSUMED_TIME}
                  value={formData[UI_PROJECT_KEYS.CONSUMED_TIME]}
                  onChange={handleChange}
                className='w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-slate-700'
              />
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-bold text-slate-500 uppercase text-emerald-600'>Total Sales (ZAR)</label>
              <div className='relative'>
                <span className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'>R</span>
                <input
                  type='number'
                  name={UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT}
                  value={formData[UI_PROJECT_KEYS.TOTAL_SALES_AMOUNT]}
                  onChange={handleChange}
                  className='w-full bg-emerald-50/30 border border-emerald-100 rounded-xl pl-8 pr-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 transition-all font-semibold text-emerald-700'
                />
              </div>
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-bold text-slate-500 uppercase text-rose-600'>Total Cost (ZAR)</label>
              <div className='relative'>
                <span className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'>R</span>
                <input
                  type='number'
                  name={UI_PROJECT_KEYS.TOTAL_COSTING}
                  value={formData[UI_PROJECT_KEYS.TOTAL_COSTING]}
                  onChange={handleChange}
                  className='w-full bg-rose-50/30 border border-rose-100 rounded-xl pl-8 pr-4 py-3 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all font-semibold text-rose-700'
                />
              </div>
            </div>
          </div>

          <div className='mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3'>
            <button
              type='button'
              onClick={onClose}
              className='px-6 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='px-6 py-2.5 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 hover:-translate-y-0.5 transform transition-all flex items-center gap-2'
            >
              <Save size={18} /> Process Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProjectModal;
