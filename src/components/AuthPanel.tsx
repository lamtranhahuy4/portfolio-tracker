'use client';

import { FormEvent, useEffect, useState, useTransition } from 'react';
import { Languages } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signInAction, signUpAction } from '@/actions/auth';
import { DASHBOARD_LANGUAGE_STORAGE_KEY, DashboardLanguage } from '@/lib/dashboardLocale';

const LOGIN_ERROR_VI = 'Bạn đã nhập sai tài khoản/mật khẩu. Nếu không nhớ có thể dùng chức năng Quên mật khẩu.';
const LOGIN_ERROR_EN = 'Incorrect email or password. If you forgot your password, use the "Forgot password" feature.';

const copy = {
  vi: {
    product: 'Portfolio Tracker',
    signUp: 'Tạo tài khoản',
    signIn: 'Đăng nhập',
    subtitle: 'Mỗi tài khoản chỉ nhìn thấy dữ liệu danh mục của riêng mình.',
    passwordPlaceholder: 'Tối thiểu 8 ký tự',
    processing: 'Đang xử lý...',
    hasAccount: 'Đã có tài khoản? Đăng nhập',
    noAccount: 'Chưa có tài khoản? Tạo mới',
    language: 'Ngôn ngữ',
    vi: 'VI',
    en: 'EN',
    loginError: LOGIN_ERROR_VI,
    errors: {
      'Email và mật khẩu là bắt buộc.': 'Email và mật khẩu là bắt buộc.',
      'Mật khẩu phải có ít nhất 8 ký tự.': 'Mật khẩu phải có ít nhất 8 ký tự.',
      'Email này đã được sử dụng.': 'Email này đã được sử dụng.',
    },
  },
  en: {
    product: 'Portfolio Tracker',
    signUp: 'Create account',
    signIn: 'Sign in',
    subtitle: 'Each account can only access its own portfolio data.',
    passwordPlaceholder: 'At least 8 characters',
    processing: 'Processing...',
    hasAccount: 'Already have an account? Sign in',
    noAccount: 'No account yet? Create one',
    language: 'Language',
    vi: 'VI',
    en: 'EN',
    loginError: LOGIN_ERROR_EN,
    errors: {
      'Email and password are required.': 'Email and password are required.',
      'Password must be at least 8 characters.': 'Password must be at least 8 characters.',
      'This email address is already in use.': 'This email address is already in use.',
    },
  },
} satisfies Record<DashboardLanguage, any>;

function translateError(message: string, language: DashboardLanguage): string {
  const dictionary = copy[language].errors as Record<string, string>;
  const translated = dictionary[message];
  if (translated) return translated;
  
  if (message.includes('sai') || message.includes('không') || 
      message.includes('wrong') || message.includes('incorrect') ||
      message.includes('khong')) {
    return copy[language].loginError;
  }
  
  return message;
}

export default function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [language, setLanguage] = useState<DashboardLanguage>('vi');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(DASHBOARD_LANGUAGE_STORAGE_KEY);
    if (storedLanguage === 'vi' || storedLanguage === 'en') {
      setLanguage(storedLanguage);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DASHBOARD_LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const t = copy[language];

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');

    startTransition(async () => {
      try {
        if (mode === 'signup') {
          await signUpAction(email, password);
        } else {
          await signInAction(email, password);
        }
        router.refresh();
      } catch (actionError) {
        setError(translateError((actionError as Error).message, language));
      }
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="flex items-center justify-end">
          <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-950/80 p-1 text-sm text-slate-300">
            <div className="flex items-center gap-2 px-3 text-slate-400">
              <Languages className="h-4 w-4" />
              <span>{t.language}</span>
            </div>
            <button type="button" onClick={() => setLanguage('vi')} className={language === 'vi' ? 'rounded-xl bg-blue-600 px-3 py-1.5 text-white' : 'rounded-xl px-3 py-1.5 text-slate-400 hover:bg-slate-900'}>{t.vi}</button>
            <button type="button" onClick={() => setLanguage('en')} className={language === 'en' ? 'rounded-xl bg-blue-600 px-3 py-1.5 text-white' : 'rounded-xl px-3 py-1.5 text-slate-400 hover:bg-slate-900'}>{t.en}</button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-400">{t.product}</p>
          <h1 className="text-3xl font-bold text-slate-100">{mode === 'signup' ? t.signUp : t.signIn}</h1>
          <p className="text-sm text-slate-400">{t.subtitle}</p>
        </div>

        <form className="space-y-4" method="post" onSubmit={handleSubmit}>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <input
            name="password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder={t.passwordPlaceholder}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500"
            required
            minLength={8}
          />

          {error && (
            <p className="rounded-xl bg-rose-950/40 px-4 py-3 text-sm text-rose-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
          >
            {isPending ? t.processing : mode === 'signup' ? t.signUp : t.signIn}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
          }}
          className="w-full text-sm text-slate-300 transition-colors hover:text-indigo-400"
        >
          {mode === 'signup' ? t.hasAccount : t.noAccount}
        </button>

        {mode === 'signin' && (
          <a
            href="/forgot-password"
            className="block text-center text-xs text-slate-500 transition-colors hover:text-indigo-400"
          >
            {language === 'vi' ? 'Quên mật khẩu?' : 'Forgot password?'}
          </a>
        )}
      </div>
    </main>
  );
}
