'use client';

import { useState, useTransition } from 'react';
import { Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { saveManualDeposit } from '@/actions/cashLedger';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { toMoney } from '@/domain/portfolio/primitives';
import { CashLedgerEvent } from '@/types/portfolio';
import NumberInput from '@/components/NumberInput';

export default function AddDepositForm() {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [isPending, startTransition] = useTransition();
  const addCashEvents = usePortfolioStore((state) => state.addCashEvents);
  const cashEvents = usePortfolioStore((state) => state.cashEvents);
  const initialCashBalance = usePortfolioStore((state) => state.initialCashBalance);

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleSubmit = () => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast.error('Số tiền không hợp lệ.');
      return;
    }

    const depositDate = new Date(date).getTime();
    const beforeEvents = cashEvents.filter(
      (e) => new Date(e.date).getTime() <= depositDate
    );
    const sorted = [...beforeEvents].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const lastBalance = sorted.length > 0 ? sorted[0].balanceAfter : initialCashBalance;

    const event: CashLedgerEvent = {
      id: crypto.randomUUID(),
      date: new Date(date),
      direction: 'INFLOW',
      amount: toMoney(numericAmount),
      balanceAfter: toMoney(lastBalance + numericAmount),
      eventType: 'DEPOSIT',
      description: description.trim() || 'Nạp tiền thủ công',
      source: 'manual',
    };

    startTransition(async () => {
      try {
        await saveManualDeposit(event);
        addCashEvents([event]);
        toast.success('Đã ghi nhận khoản nạp tiền.');
        resetForm();
      } catch (error) {
        toast.error((error as Error).message);
      }
    });
  };

  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Nạp tiền</h3>
          <p className="mt-2 text-sm text-slate-400">
            Ghi nhận tiền bạn chuyển vào tài khoản chứng khoán.
          </p>
        </div>
        <Banknote className="mt-1 h-5 w-5 text-emerald-400" />
      </div>

      <div className="mt-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Số tiền (VND)</label>
          <NumberInput
            value={amount}
            onChange={setAmount}
            placeholder="1.000.000"
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Ngày</label>
          <input
            type="date"
            max={new Date().toISOString().split('T')[0]}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none [color-scheme:dark]"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Mô tả (tuỳ chọn)</label>
          <input
            type="text"
            placeholder="Chuyển tiền vào tài khoản"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? 'Đang lưu...' : 'Ghi nhận nạp tiền'}
      </button>
    </div>
  );
}
