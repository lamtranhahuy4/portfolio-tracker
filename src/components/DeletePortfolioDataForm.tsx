'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { deleteMyTransactionsAction } from '@/actions/account';
import { AlertOctagon, Trash2, Loader2 } from 'lucide-react';
import { DashboardLanguage } from '@/lib/dashboardLocale';

const copy = {
  vi: {
    invalidConfirm: 'Vui lòng nhập chính xác chữ DELETE',
    loading: 'Đang xóa dữ liệu...',
    genericError: 'Đã xảy ra lỗi',
    title: 'Khu vực Nguy hiểm',
    desc: 'Thao tác này sẽ xóa vĩnh viễn toàn bộ dữ liệu giao dịch danh mục của bạn khỏi hệ thống. Hành động này không thể hoàn tác. Các cài đặt tài khoản như email và mật khẩu vẫn được giữ nguyên.',
    label: 'Chữ xác nhận: Nhập chữ',
    intoField: 'vào ô bên dưới',
    placeholder: 'Nhập chữ DELETE',
    submit: 'Xóa tất cả',
    successMap: {
      'Đã xóa toàn bộ dữ liệu giao dịch của bạn.': 'Đã xóa toàn bộ dữ liệu giao dịch của bạn.',
    },
    errorMap: {
      'Chữ xác nhận không hợp lệ. Vui lòng nhập đúng chữ DELETE.': 'Chữ xác nhận không hợp lệ. Vui lòng nhập đúng chữ DELETE.',
    },
  },
  en: {
    invalidConfirm: 'Please type DELETE exactly to confirm.',
    loading: 'Deleting data...',
    genericError: 'An error occurred',
    title: 'Danger Zone',
    desc: 'This action permanently deletes all portfolio transaction data from the system. It cannot be undone. Account settings such as email and password remain intact.',
    label: 'Confirmation text: Type',
    intoField: 'into the field below',
    placeholder: 'Type DELETE',
    submit: 'Delete everything',
    successMap: {
      'Đã xóa toàn bộ dữ liệu giao dịch của bạn.': 'All of your portfolio transaction data has been deleted.',
    },
    errorMap: {
      'Chữ xác nhận không hợp lệ. Vui lòng nhập đúng chữ DELETE.': 'Invalid confirmation text. Please type DELETE exactly.',
    },
  },
} satisfies Record<DashboardLanguage, any>;

function tr(message: string, language: DashboardLanguage, kind: 'successMap' | 'errorMap') {
  return copy[language][kind][message] ?? message;
}

export default function DeletePortfolioDataForm({ language }: { language: DashboardLanguage }) {
  const t = copy[language];
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== 'DELETE') {
      toast.error(t.invalidConfirm);
      return;
    }

    setLoading(true);
    try {
      const res = await deleteMyTransactionsAction(confirmText);
      if (res.success) {
        toast.promise(
          new Promise((resolve) => setTimeout(resolve, 1500)),
          {
            loading: t.loading,
            success: () => {
              window.location.href = '/';
              return tr(res.message, language, 'successMap');
            },
            error: t.genericError,
          }
        );
      }
    } catch (err) {
      toast.error(tr((err as Error).message, language, 'errorMap'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-red-900/50 bg-red-950/20 p-6 shadow-sm">
      <div className="pointer-events-none absolute -right-8 -top-8 rotate-12 text-red-900/20 opacity-50">
        <AlertOctagon className="h-48 w-48" />
      </div>

      <div className="relative z-10 flex items-start gap-4">
        <div className="shrink-0 rounded-xl bg-red-900/40 p-3">
          <Trash2 className="h-6 w-6 text-red-400" />
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white">{t.title}</h2>
            <p className="mt-1 text-sm text-red-300">{t.desc}</p>
          </div>

          <form onSubmit={handleDelete} className="rounded-xl border border-red-900/30 bg-slate-950/40 p-4">
            <label className="mb-2 block text-sm font-medium text-slate-300">
              {t.label} <span className="rounded bg-slate-900 px-1 font-mono font-bold text-red-400">DELETE</span> {t.intoField}
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} required className="flex-1 rounded-xl border border-red-900/50 bg-slate-950 px-4 py-2.5 font-mono text-white outline-none transition-all focus:border-red-500 focus:ring-1 focus:ring-red-500" placeholder={t.placeholder} />
              <button type="submit" disabled={loading || confirmText !== 'DELETE'} className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 font-bold tracking-wide text-white shadow-md shadow-red-500/20 transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {t.submit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
