'use client';

import { useTransition } from 'react';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { signOutAction } from '@/actions/auth';

export default function LogoutButton() {
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
      className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-60 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors"
    >
      <LogOut className="h-4 w-4" />
      {isPending ? 'Đang thoát...' : 'Đăng xuất'}
    </button>
  );
}
