'use client';

import { useEffect, useState, useTransition } from 'react';
import { ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { saveFeeDebtSetting } from '@/actions/portfolioSettings';
import { usePortfolioMetrics, usePortfolioStore } from '@/store/usePortfolioStore';

export default function FeeDebtCard() {
  const metrics = usePortfolioMetrics();
  const feeDebt = usePortfolioStore((state) => state.feeDebt);
  const setFeeDebt = usePortfolioStore((state) => state.setFeeDebt);
  const [draftValue, setDraftValue] = useState(String(feeDebt || ''));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setDraftValue(String(feeDebt || ''));
  }, [feeDebt]);

  const saveValue = () => {
    startTransition(async () => {
      try {
        const numeric = Number(draftValue || 0);
        const result = await saveFeeDebtSetting(numeric);
        setFeeDebt(result.feeDebt);
        toast.success('Đã lưu nợ phí.');
      } catch (error) {
        toast.error((error as Error).message);
      }
    });
  };

  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Fee Debt</h3>
          <p className="mt-2 text-sm text-slate-400">
            Trừ khoản nợ phí broker khỏi NAV hiện tại. Dùng khi app DNSE hiển thị &quot;nợ phí&quot; nhưng cash report chưa phản ánh trực tiếp.
          </p>
        </div>
        <ReceiptText className="mt-1 h-5 w-5 text-rose-400" />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Current Fee Debt</label>
        <input
          type="number"
          min="0"
          step="1"
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
        />
        <div className="mt-3 text-xs text-slate-500">
          NAV đang trừ: {new Intl.NumberFormat('vi-VN').format(metrics.feeDebt)} VND
        </div>
      </div>

      <button
        type="button"
        onClick={saveValue}
        disabled={isPending}
        className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        Lưu nợ phí
      </button>
    </div>
  );
}
