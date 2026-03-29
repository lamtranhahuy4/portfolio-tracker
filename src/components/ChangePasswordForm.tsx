'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { changePasswordAction } from '@/actions/account';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { DashboardLanguage } from '@/lib/dashboardLocale';

const copy = {
  vi: {
    title: 'Đổi mật khẩu',
    subtitle: 'Bảo mật tài khoản của bạn',
    current: 'Mật khẩu hiện tại',
    currentPlaceholder: 'Nhập mật khẩu cũ...',
    next: 'Mật khẩu mới',
    nextPlaceholder: 'Ít nhất 8 ký tự...',
    confirm: 'Xác nhận',
    confirmPlaceholder: 'Nhập lại mật khẩu mới...',
    hide: 'Ẩn mật khẩu',
    show: 'Hiện mật khẩu',
    submit: 'Cập nhật',
    errors: {
      'Mật khẩu xác nhận không khớp.': 'Mật khẩu xác nhận không khớp.',
      'Mật khẩu mới phải có ít nhất 8 ký tự.': 'Mật khẩu mới phải có ít nhất 8 ký tự.',
      'Mật khẩu hiện tại không đúng.': 'Mật khẩu hiện tại không đúng.',
      'Mật khẩu mới không được trùng với mật khẩu cũ.': 'Mật khẩu mới không được trùng với mật khẩu cũ.',
      'Đổi mật khẩu thành công.': 'Đổi mật khẩu thành công.',
    },
  },
  en: {
    title: 'Change password',
    subtitle: 'Secure your account',
    current: 'Current password',
    currentPlaceholder: 'Enter current password...',
    next: 'New password',
    nextPlaceholder: 'At least 8 characters...',
    confirm: 'Confirm',
    confirmPlaceholder: 'Re-enter the new password...',
    hide: 'Hide password',
    show: 'Show password',
    submit: 'Update',
    errors: {
      'Mật khẩu xác nhận không khớp.': 'Password confirmation does not match.',
      'Mật khẩu mới phải có ít nhất 8 ký tự.': 'New password must be at least 8 characters.',
      'Mật khẩu hiện tại không đúng.': 'Current password is incorrect.',
      'Mật khẩu mới không được trùng với mật khẩu cũ.': 'New password must be different from the current one.',
      'Đổi mật khẩu thành công.': 'Password updated successfully.',
    },
  },
} satisfies Record<DashboardLanguage, any>;

function tr(message: string, language: DashboardLanguage) {
  return copy[language].errors[message] ?? message;
}

export default function ChangePasswordForm({ language }: { language: DashboardLanguage }) {
  const t = copy[language];
  const [current, setCurrent] = useState('');
  const [neu, setNeu] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await changePasswordAction(current, neu, confirm);
      if (res.success) {
        toast.success(tr(res.message, language));
        setCurrent('');
        setNeu('');
        setConfirm('');
      }
    } catch (err) {
      toast.error(tr((err as Error).message, language));
    } finally {
      setLoading(false);
    }
  };

  const inputType = show ? 'text' : 'password';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-xl bg-indigo-900/30 p-2.5">
          <Lock className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">{t.title}</h2>
          <p className="text-sm text-slate-400">{t.subtitle}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">{t.current}</label>
          <input type={inputType} value={current} onChange={(e) => setCurrent(e.target.value)} required className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none transition-colors focus:border-indigo-500" placeholder={t.currentPlaceholder} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">{t.next}</label>
            <input type={inputType} value={neu} onChange={(e) => setNeu(e.target.value)} required minLength={8} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none transition-colors focus:border-indigo-500" placeholder={t.nextPlaceholder} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300">{t.confirm}</label>
            <input type={inputType} value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none transition-colors focus:border-indigo-500" placeholder={t.confirmPlaceholder} />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={() => setShow(!show)} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {show ? t.hide : t.show}
          </button>

          <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
