'use client';

import { useState, useTransition } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';
import { saveManualTransaction } from '@/actions/transaction';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { toMoney, toPrice, toQuantity } from '@/domain/portfolio/primitives';
import { NormalizedTransaction } from '@/types/portfolio';
import NumberInput from '@/components/NumberInput';

const TX_TYPES = [
  { value: 'BUY', label: 'Mua' },
  { value: 'SELL', label: 'Bán' },
] as const;

const ASSET_CLASSES = [
  { value: 'STOCK', label: 'Cổ phiếu' },
  { value: 'FUND', label: 'Chứng chỉ quỹ' },
  { value: 'CASH', label: 'Tiền' },
  { value: 'SAVING', label: 'Tiết kiệm' },
] as const;

export default function AddTradeForm() {
  const [assetClass, setAssetClass] = useState<string>('STOCK');
  const [type, setType] = useState<string>('BUY');
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fee, setFee] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();

  const addTransactions = usePortfolioStore((state) => state.addTransactions);

  const resetForm = () => {
    setTicker('');
    setQuantity('');
    setPrice('');
    setFee('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleSubmit = () => {
    const numericQuantity = Number(quantity);
    const numericPrice = Number(price);
    const numericFee = Number(fee) || 0;

    if (!ticker.trim()) { toast.error('Mã cổ phiếu không hợp lệ.'); return; }
    if (!numericQuantity || numericQuantity <= 0) { toast.error('Số lượng không hợp lệ.'); return; }
    if (!numericPrice || numericPrice <= 0) { toast.error('Giá không hợp lệ.'); return; }

    const event: NormalizedTransaction = {
      id: crypto.randomUUID(),
      date: new Date(date),
      assetClass: assetClass as NormalizedTransaction['assetClass'],
      ticker: ticker.trim().toUpperCase(),
      type: type as NormalizedTransaction['type'],
      quantity: toQuantity(numericQuantity),
      price: toPrice(numericPrice),
      fee: toMoney(numericFee),
      tax: toMoney(0),
      totalValue: toMoney(
        type === 'SELL'
          ? numericQuantity * numericPrice - numericFee
          : numericQuantity * numericPrice + numericFee
      ),
      notes: notes.trim() || undefined,
    };

    startTransition(async () => {
      try {
        await saveManualTransaction(event);
        addTransactions([event]);
        toast.success(`Đã ghi nhận lệnh ${type === 'BUY' ? 'mua' : 'bán'} ${ticker.trim().toUpperCase()}.`);
        resetForm();
      } catch (error) {
        toast.error((error as Error).message);
      }
    });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Thêm giao dịch</h3>
          <p className="mt-2 text-sm text-slate-400">
            Ghi nhận lệnh mua hoặc bán cổ phiếu.
          </p>
        </div>
        <ArrowLeftRight className="mt-1 h-5 w-5 text-blue-400" />
      </div>

      <div className="mt-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Loại</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-base sm:text-sm text-slate-100 outline-none"
            >
              {TX_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Loại TS</label>
            <select
              value={assetClass}
              onChange={(e) => setAssetClass(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-base sm:text-sm text-slate-100 outline-none"
            >
              {ASSET_CLASSES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Mã cổ phiếu</label>
          <input
            type="text"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            placeholder="HPG"
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-base sm:text-sm text-slate-100 outline-none uppercase"
            maxLength={10}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Số lượng</label>
            <NumberInput
              value={quantity}
              onChange={setQuantity}
              placeholder="1000"
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-base sm:text-sm text-slate-100 outline-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Giá (VND)</label>
            <NumberInput
              value={price}
              onChange={setPrice}
              placeholder="30.000"
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-base sm:text-sm text-slate-100 outline-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Phí</label>
            <NumberInput
              value={fee}
              onChange={setFee}
              placeholder="0"
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-base sm:text-sm text-slate-100 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Ngày</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-base sm:text-sm text-slate-100 outline-none [color-scheme:dark]"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Ghi chú (tuỳ chọn)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Mua cổ phiếu lần đầu"
            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-base sm:text-sm text-slate-100 outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? 'Đang lưu...' : 'Ghi nhận giao dịch'}
      </button>
    </form>
  );
}
