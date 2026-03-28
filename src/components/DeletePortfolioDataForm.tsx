'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { deleteMyTransactionsAction } from '@/actions/account';
import { AlertOctagon, Trash2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DeletePortfolioDataForm() {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText !== 'DELETE') {
      toast.error('Vui lòng nhập chính xác chữ DELETE');
      return;
    }

    setLoading(true);
    try {
      const res = await deleteMyTransactionsAction(confirmText);
      if (res.success) {
        toast.promise(
          new Promise(resolve => setTimeout(resolve, 1500)),
          {
            loading: 'Đang xóa dữ liệu...',
            success: () => {
              // Optionally trigger a full hard reload to clear any zustand client state completely
              window.location.href = '/';
              return res.message;
            },
            error: 'Đã xảy ra lỗi'
          }
        );
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 shadow-sm overflow-hidden relative">
      <div className="absolute -right-8 -top-8 text-red-100 dark:text-red-900/20 transform rotate-12 opacity-50 pointer-events-none">
        <AlertOctagon className="w-48 h-48" />
      </div>

      <div className="relative z-10 flex items-start gap-4">
        <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-xl shrink-0">
          <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Khu vực Nguy hiểm</h2>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              Thao tác này sẽ xóa vĩnh viễn <strong>toàn bộ</strong> dữ liệu giao dịch danh mục của bạn khỏi hệ thống. Hành động này là không thể hoàn tác. Các cài đặt tài khoản (email, mật khẩu) vẫn được giữ nguyên.
            </p>
          </div>

          <form onSubmit={handleDelete} className="bg-white/60 dark:bg-gray-900/50 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Chữ xác nhận: Nhập chữ <span className="font-mono font-bold bg-gray-100 dark:bg-gray-800 px-1 rounded text-red-500">DELETE</span> vào ô bên dưới
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input 
                type="text"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                required
                className="flex-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 outline-none border border-red-200 dark:border-red-900/50 focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
                placeholder="Nhập chữ DELETE"
              />
              <button
                type="submit"
                disabled={loading || confirmText !== 'DELETE'}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-bold tracking-wide transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-red-500/20"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Xóa tất cả
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
