'use client';

import { useTransition } from 'react';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signOutAction } from '@/actions/auth';
import { DashboardLanguage } from '@/lib/dashboardLocale';

export default function LogoutButton({ language }: { language: DashboardLanguage }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(async () => {
        await signOutAction();
        router.refresh();
      })}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-60"
    >
      <LogOut className="h-4 w-4" />
      {isPending ? (language === 'vi' ? 'Đang thoát...' : 'Signing out...') : (language === 'vi' ? 'Đăng xuất' : 'Sign out')}
    </button>
  );
}
