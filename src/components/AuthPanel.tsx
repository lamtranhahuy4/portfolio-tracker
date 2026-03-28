'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signInAction, signUpAction } from '@/actions/auth';

export default function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
        setError((actionError as Error).message);
      }
    });
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-xl p-8 space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-[0.3em] text-indigo-600 uppercase">Portfolio Tracker</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {mode === 'signup' ? 'Tạo tài khoản' : 'Đăng nhập'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mỗi tài khoản chỉ nhìn thấy dữ liệu danh mục của riêng mình.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <input
            name="password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder="Tối thiểu 8 ký tự"
            className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            required
            minLength={8}
          />

          {error && (
            <p className="rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 px-4 py-3 text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold py-3 transition-colors"
          >
            {isPending ? 'Đang xử lý...' : mode === 'signup' ? 'Tạo tài khoản' : 'Đăng nhập'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError(null);
          }}
          className="w-full text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          {mode === 'signup' ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Tạo mới'}
        </button>
      </div>
    </main>
  );
}
