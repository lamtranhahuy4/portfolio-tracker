'use client';

import { FormEvent, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { resetPasswordAction } from '@/actions/auth';

const copy = {
  vi: {
    title: 'Đặt lại mật khẩu',
    subtitle: 'Nhập mật khẩu mới cho tài khoản của bạn.',
    passwordPlaceholder: 'Mật khẩu mới (tối thiểu 8 ký tự)',
    confirmPlaceholder: 'Xác nhận mật khẩu mới',
    submit: 'Đặt lại mật khẩu',
    processing: 'Đang xử lý...',
    success: 'Mật khẩu đã được đặt lại thành công!',
    goToLogin: 'Đi đến trang đăng nhập',
    error: 'Đã xảy ra lỗi. Liên kết có thể đã hết hạn.',
    invalidToken: 'Liên kết đặt lại không hợp lệ hoặc đã hết hạn.',
    passwordMismatch: 'Mật khẩu xác nhận không khớp.',
  },
  en: {
    title: 'Reset Password',
    subtitle: 'Enter your new password for your account.',
    passwordPlaceholder: 'New password (minimum 8 characters)',
    confirmPlaceholder: 'Confirm new password',
    submit: 'Reset Password',
    processing: 'Processing...',
    success: 'Password reset successfully!',
    goToLogin: 'Go to login',
    error: 'An error occurred. The link may have expired.',
    invalidToken: 'Reset link is invalid or has expired.',
    passwordMismatch: 'Password confirmation does not match.',
  },
};

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const t = copy[language];

  useEffect(() => {
    const storedLang = window.localStorage.getItem('dashboard_language');
    if (storedLang === 'vi' || storedLang === 'en') {
      setLanguage(storedLang);
    }
  }, []);

  if (!token || !email) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl text-center">
          <h1 className="text-2xl font-bold text-rose-400">❌</h1>
          <h1 className="text-2xl font-bold text-slate-100">{t.invalidToken}</h1>
          <p className="text-sm text-slate-400">
            {language === 'vi' 
              ? 'Liên kết đặt lại không hợp lệ. Vui lòng yêu cầu đặt lại mật khẩu mới.'
              : 'Invalid reset link. Please request a new password reset.'}
          </p>
          <a
            href="/forgot-password"
            className="block w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            {language === 'vi' ? 'Yêu cầu đặt lại mật khẩu' : 'Request Password Reset'}
          </a>
        </div>
      </main>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    if (password !== confirmPassword) {
      setStatus('error');
      setMessage(t.passwordMismatch);
      return;
    }

    try {
      const result = await resetPasswordAction(token, email, password);
      
      if ((result as { success?: boolean }).success) {
        setStatus('success');
        setMessage(t.success);
      }
    } catch (error) {
      setStatus('error');
      setMessage((error as Error).message || t.error);
    }
  };

  if (status === 'success') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl text-center">
          <h1 className="text-4xl">✅</h1>
          <h1 className="text-2xl font-bold text-emerald-400">{t.success}</h1>
          <a
            href="/login"
            className="block w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition-colors hover:bg-indigo-500"
          >
            {t.goToLogin}
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-400">Portfolio Tracker</p>
          <h1 className="text-3xl font-bold text-slate-100">{t.title}</h1>
          <p className="text-sm text-slate-400 truncate">
            <span className="text-slate-500">{language === 'vi' ? 'Email: ' : 'Email: '}</span>
            {email}
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder={t.passwordPlaceholder}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            minLength={8}
            required
          />
          
          <input
            type="password"
            placeholder={t.confirmPlaceholder}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            minLength={8}
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
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-slate-400">Loading...</div>
      </main>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
