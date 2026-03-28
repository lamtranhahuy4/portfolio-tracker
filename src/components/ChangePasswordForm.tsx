'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { changePasswordAction } from '@/actions/account';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function ChangePasswordForm() {
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
        toast.success(res.message);
        setCurrent('');
        setNeu('');
        setConfirm('');
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const InputType = show ? 'text' : 'password';

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
          <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Đổi mật khẩu</h2>
          <p className="text-sm text-gray-500">Bảo mật tài khoản của bạn</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mật khẩu hiện tại</label>
          <div className="relative">
            <input 
              type={InputType}
              value={current}
              onChange={e => setCurrent(e.target.value)}
              required
              className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 outline-none border border-transparent focus:border-indigo-500 transition-colors"
              placeholder="Nhập mật khẩu cũ..."
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Mật khẩu mới</label>
            <input 
              type={InputType}
              value={neu}
              onChange={e => setNeu(e.target.value)}
              required
              minLength={8}
              className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 outline-none border border-transparent focus:border-indigo-500 transition-colors"
              placeholder="Ít nhất 8 ký tự..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Xác nhận</label>
            <input 
              type={InputType}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={8}
              className="w-full bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 outline-none border border-transparent focus:border-indigo-500 transition-colors"
              placeholder="Nhập lại mật khẩu mới..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button 
            type="button" 
            onClick={() => setShow(!show)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1.5"
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Cập nhật
          </button>
        </div>
      </form>
    </div>
  );
}
