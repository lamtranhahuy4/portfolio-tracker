'use client';

import { FormEvent, useState } from 'react';
import { requestPasswordResetAction } from '@/actions/auth';
import { Languages } from 'lucide-react';
import { DASHBOARD_LANGUAGE_STORAGE_KEY, DashboardLanguage } from '@/lib/dashboardLocale';

const copy = {
  vi: {
    title: 'Quên mật khẩu',
    subtitle: 'Nhập email của bạn để nhận liên kết đặt lại mật khẩu.',
    emailPlaceholder: 'Email của bạn',
    submit: 'Gửi liên kết đặt lại',
    processing: 'Đang gửi...',
    backToLogin: 'Quay lại đăng nhập',
    success: 'Kiểm tra email để đặt lại mật khẩu.',
    error: 'Đã xảy ra lỗi. Vui lòng thử lại.',
    language: 'Ngôn ngữ',
    vi: 'VI',
    en: 'EN',
    devNote: 'Dev Mode: Token đã in ra console',
  },
  en: {
    title: 'Forgot Password',
    subtitle: 'Enter your email to receive a password reset link.',
    emailPlaceholder: 'Your email',
    submit: 'Send Reset Link',
    processing: 'Sending...',
    backToLogin: 'Back to login',
    success: 'Check your email to reset password.',
    error: 'An error occurred. Please try again.',
    language: 'Language',
    vi: 'VI',
    en: 'EN',
    devNote: 'Dev Mode: Token printed to console',
  },
};

interface RequestPasswordResetResponse {
  success: boolean;
  message?: string;
  devPreview?: string;
}

export default function ForgotPassword() {
  const [language, setLanguage] = useState<DashboardLanguage>('vi');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [devUrl, setDevUrl] = useState('');

  const t = copy[language];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const result = await requestPasswordResetAction(email) as RequestPasswordResetResponse;
      
      if (result.success) {
        setStatus('success');
        setMessage(result.message || t.success);
        if (result.devPreview) {
          setDevUrl(result.devPreview);
          console.log('🔑 Password Reset URL:', result.devPreview);
        }
      }
    } catch (error) {
      setStatus('error');
      setMessage(t.error);
    }
  };

  if (status === 'success') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <div className="flex items-center justify-end">
            <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-950/80 p-1 text-sm text-slate-300">
              <button type="button" onClick={() => setLanguage('vi')} className={language === 'vi' ? 'rounded-xl bg-blue-600 px-3 py-1.5 text-white' : 'rounded-xl px-3 py-1.5 text-slate-400 hover:bg-slate-900'}>VI</button>
              <button type="button" onClick={() => setLanguage('en')} className={language === 'en' ? 'rounded-xl bg-blue-600 px-3 py-1.5 text-white' : 'rounded-xl px-3 py-1.5 text-slate-400 hover:bg-slate-900'}>EN</button>
            </div>
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-emerald-400">✓</h1>
            <h1 className="text-2xl font-bold text-slate-100">{language === 'vi' ? 'Đã gửi!' : 'Sent!'}</h1>
            <p className="text-sm text-slate-400">{message}</p>
          </div>

          {devUrl && (
            <div className="rounded-xl bg-amber-950/40 p-4">
              <p className="mb-2 text-xs font-semibold text-amber-400">🔑 Dev Mode - Reset Link:</p>
              <a href={devUrl} className="break-all text-xs text-amber-300 underline hover:text-amber-200">
                {devUrl}
              </a>
            </div>
          )}

          <a
            href="/login"
            className="block w-full rounded-xl border border-slate-700 py-3 text-center text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800"
          >
            {t.backToLogin}
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="flex items-center justify-end">
          <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-950/80 p-1 text-sm text-slate-300">
            <button type="button" onClick={() => setLanguage('vi')} className={language === 'vi' ? 'rounded-xl bg-blue-600 px-3 py-1.5 text-white' : 'rounded-xl px-3 py-1.5 text-slate-400 hover:bg-slate-900'}>VI</button>
            <button type="button" onClick={() => setLanguage('en')} className={language === 'en' ? 'rounded-xl bg-blue-600 px-3 py-1.5 text-white' : 'rounded-xl px-3 py-1.5 text-slate-400 hover:bg-slate-900'}>EN</button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-400">Portfolio Tracker</p>
          <h1 className="text-3xl font-bold text-slate-100">{t.title}</h1>
          <p className="text-sm text-slate-400">{t.subtitle}</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />

          {status === 'error' && (
            <p className="rounded-xl bg-rose-950/40 px-4 py-3 text-sm text-rose-300">{message}</p>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
          >
            {status === 'loading' ? t.processing : t.submit}
          </button>
        </form>

        <a
          href="/login"
          className="block w-full text-center text-sm text-slate-300 transition-colors hover:text-indigo-400"
        >
          {t.backToLogin}
        </a>
      </div>
    </main>
  );
}
