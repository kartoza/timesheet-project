import React, { FormEvent, useState } from 'react';
import { AlertCircle, Loader2, Lock, LogIn, Mail } from 'lucide-react';
import { login } from '../../services/pmo_dashboard/api';
import { SessionUser } from '../../types/pmo_dashboard';

type LoginPageProps = {
  onLoginSuccess: (user: SessionUser) => void;
};

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await login(email, password);
      if (response.success) {
        onLoginSuccess(response.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden p-4'>
      <div className='absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none'></div>
      <div className='absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-teal-500/10 blur-[120px] rounded-full pointer-events-none'></div>

      <div className='w-full max-w-md animate-entrance'>
        <div className='text-center mb-8'>
          <div className='inline-flex items-center justify-center w-24 h-24 bg-white rounded-3xl shadow-xl shadow-indigo-100 border border-indigo-50 mb-6 group hover:scale-105 transition-transform duration-500 overflow-hidden p-4'>
            <img src='/kartoza-logo.png' alt='Kartoza Logo' className='w-full h-full object-contain group-hover:scale-110 transition-transform duration-500' />
          </div>
          <h1 className='text-3xl font-extrabold text-slate-800 tracking-tight'>Kartoza Executive Gateway</h1>
          <p className='text-slate-500 font-medium mt-2'>Secure access to PMO Portfolio Dashboard</p>
        </div>

        <div className='glass-card p-8 md:p-10 border-white/60 shadow-2xl shadow-indigo-200/20'>
          <form onSubmit={handleSubmit} className='space-y-6'>
            {error && (
              <div className='p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300'>
                <AlertCircle className='text-rose-600 shrink-0 mt-0.5' size={18} />
                <p className='text-sm font-bold text-rose-700 leading-tight'>{error}</p>
              </div>
            )}

            <div className='space-y-2'>
              <label className='text-xs font-bold text-slate-500 uppercase tracking-widest ml-1'>Email Address</label>
              <div className='relative group'>
                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <Mail className='text-slate-400 group-focus-within:text-indigo-500 transition-colors' size={18} />
                </div>
                <input
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-medium placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all duration-300'
                  placeholder='name@company.com'
                  required
                />
              </div>
            </div>

            <div className='space-y-2'>
              <div className='flex justify-between items-center ml-1'>
                <label className='text-xs font-bold text-slate-500 uppercase tracking-widest'>Password</label>
              </div>
              <div className='relative group'>
                <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                  <Lock className='text-slate-400 group-focus-within:text-indigo-500 transition-colors' size={18} />
                </div>
                <input
                  type='password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-medium placeholder:text-slate-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all duration-300'
                  placeholder='••••••••'
                  required
                />
              </div>
            </div>

            <button
              type='submit'
              disabled={isLoading}
              className='w-full premium-gradient text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all duration-300 disabled:opacity-70 disabled:hover:scale-100'
            >
              {isLoading ? (
                <>
                  <Loader2 className='animate-spin' size={20} />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Enter Dashboard</span>
                </>
              )}
            </button>
          </form>

          <div className='mt-8 pt-6 border-t border-slate-100 text-center'>
            <p className='text-sm text-slate-400 font-medium'>
              Made with ❤ in <span className='font-bold text-slate-600'>Kartoza</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
