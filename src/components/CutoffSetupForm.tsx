'use client';

import { useState, useTransition } from 'react';
import { Settings, Save, Calendar, Landmark, Coins, Loader2 } from 'lucide-react';
import { saveCutoffSettings } from '@/actions/portfolioSettings';
import { usePortfolioStore } from '@/store/usePortfolioStore';

interface CutoffSettings {
  globalCutoffDate: Date | null;
  initialNetContributions: number;
  initialCashBalance: number;
}

export default function CutoffSetupForm({ initialSettings, language }: { initialSettings: CutoffSettings, language: 'vi' | 'en' }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const setPortfolioSettings = usePortfolioStore((state) => state.setPortfolioSettings);

  const [date, setDate] = useState<string>(
    initialSettings.globalCutoffDate ? new Date(initialSettings.globalCutoffDate).toISOString().split('T')[0] : ''
  );
  const [netContributions, setNetContributions] = useState<string>(initialSettings.initialNetContributions.toString());
  const [cashBalance, setCashBalance] = useState<string>(initialSettings.initialCashBalance.toString());

  const t = language === 'vi' ? {
    title: 'Cài Đặt Ngày Chốt Sổ (Cut-off)',
    desc: 'Thiết lập số dư khởi đầu và ngày bắt đầu tính toán danh mục. Việc này giúp bỏ qua dữ liệu lịch sử không cần thiết.',
    cutoffDate: 'Ngày chốt sổ',
    cutoffDatePh: 'VD: 01/01/2026',
    netContributions: 'Vốn khởi đầu (Net Contributions)',
    cashBalance: 'Tiền mặt đầu kỳ (VND)',
    save: 'Lưu Cài Đặt',
    saving: 'Đang lưu...',
    success: 'Đã lưu cấu hình chốt sổ thành công!',
  } : {
    title: 'Global Cut-off Settings',
    desc: 'Set initial balance and start date for portfolio calculations. This helps bypass unnecessary historical data.',
    cutoffDate: 'Cut-off Date',
    cutoffDatePh: 'Ex: 01/01/2026',
    netContributions: 'Initial Net Contributions',
    cashBalance: 'Initial Cash Balance (VND)',
    save: 'Save Settings',
    saving: 'Saving...',
    success: 'Cut-off configuration saved successfully!',
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const pc = Number(netContributions);
    const cb = Number(cashBalance);
    
    if (isNaN(pc) || isNaN(cb)) {
      setError('Value must be a number.');
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          globalCutoffDate: date ? new Date(date) : null,
          initialNetContributions: pc,
          initialCashBalance: cb
        };
        await saveCutoffSettings(payload);
        
        // Update store eagerly
        setPortfolioSettings(payload);
        setSuccess(t.success);
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      }
    });
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl overflow-hidden mt-6">
      <div className="border-b border-slate-800/60 bg-slate-900/50 p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 ring-1 ring-inset ring-indigo-500/20">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">{t.title}</h2>
            <p className="mt-1 text-sm text-slate-400">{t.desc}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-900/50 bg-red-500/10 p-4 text-sm font-medium text-red-400">
            <div className="flex items-center gap-2">
              <span>{error}</span>
            </div>
          </div>
        )}

        {success && (
          <div className="rounded-xl border border-emerald-900/50 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-400">
             {success}
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
             <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
               <Calendar className="h-4 w-4 text-indigo-400" />
               {t.cutoffDate}
             </label>
             <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-200 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
             />
          </div>
          
          <div className="space-y-2">
             <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
               <Landmark className="h-4 w-4 text-amber-400" />
               {t.netContributions}
             </label>
             <input
                type="number"
                step="any"
                value={netContributions}
                onChange={(e) => setNetContributions(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
             />
          </div>

          <div className="space-y-2">
             <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
               <Coins className="h-4 w-4 text-emerald-400" />
               {t.cashBalance}
             </label>
             <input
                type="number"
                step="any"
                value={cashBalance}
                onChange={(e) => setCashBalance(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm font-medium text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
             />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:bg-indigo-500 disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isPending ? t.saving : t.save}
          </button>
        </div>
      </form>
    </div>
  );
}
