'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { AlertTriangle, ArchiveRestore, Save } from 'lucide-react';
import { toast } from 'sonner';
import { clearOpeningPositionSnapshot, saveOpeningPositionSnapshot } from '@/actions/openingPositions';
import { usePortfolioMetrics, usePortfolioStore } from '@/store/usePortfolioStore';

type DraftPosition = {
  ticker: string;
  quantity: string;
  averageCost: string;
};

function toDateInputValue(value: Date | null) {
  if (!value) return '';
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().split('T')[0];
}

export default function OpeningPositionCard() {
  const metrics = usePortfolioMetrics();
  const openingCutoffDate = usePortfolioStore((state) => state.openingCutoffDate);
  const openingPositions = usePortfolioStore((state) => state.openingPositions);
  const setOpeningSnapshot = usePortfolioStore((state) => state.setOpeningSnapshot);
  const [isPending, startTransition] = useTransition();
  const [cutoffDate, setCutoffDate] = useState(toDateInputValue(openingCutoffDate));
  const [rows, setRows] = useState<DraftPosition[]>([]);

  useEffect(() => {
    setCutoffDate(toDateInputValue(openingCutoffDate));
    setRows(
      openingPositions.length > 0
        ? openingPositions.map((position) => ({
            ticker: position.ticker,
            quantity: String(position.quantity),
            averageCost: String(position.averageCost),
          }))
        : [{ ticker: '', quantity: '', averageCost: '' }]
    );
  }, [openingCutoffDate, openingPositions]);

  const oversoldSuggestions = useMemo(
    () => metrics.holdings.filter((holding) => holding.assetClass === 'STOCK' && holding.totalShares < 0),
    [metrics.holdings]
  );

  const saveSnapshot = () => {
    startTransition(async () => {
      try {
        const payload = rows
          .map((row) => ({
            ticker: row.ticker.trim().toUpperCase(),
            quantity: Number(row.quantity),
            averageCost: Number(row.averageCost),
          }))
          .filter((row) => row.ticker && row.quantity > 0 && row.averageCost >= 0);

        const result = await saveOpeningPositionSnapshot(cutoffDate, payload);
        setOpeningSnapshot(result.cutoffDate, result.positions);
        toast.success(`Đã lưu ${result.positions.length} opening position.`);
      } catch (error) {
        toast.error((error as Error).message);
      }
    });
  };

  const clearSnapshot = () => {
    startTransition(async () => {
      try {
        await clearOpeningPositionSnapshot();
        setOpeningSnapshot(null, []);
        setCutoffDate('');
        setRows([{ ticker: '', quantity: '', averageCost: '' }]);
        toast.success('Đã xóa opening snapshot.');
      } catch (error) {
        toast.error((error as Error).message);
      }
    });
  };

  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Cut-off Snapshot</h3>
          <p className="mt-2 text-sm text-slate-400">
            Chốt tồn đầu kỳ để engine chỉ replay giao dịch từ ngày này trở đi. Dùng khi trade report không đủ lịch sử.
          </p>
        </div>
        <ArchiveRestore className="mt-1 h-5 w-5 text-blue-400" />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
        <label className="text-xs uppercase tracking-[0.2em] text-slate-500">Cut-off Date</label>
        <input
          type="date"
          value={cutoffDate}
          onChange={(e) => setCutoffDate(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none [color-scheme:dark]"
        />
      </div>

      {oversoldSuggestions.length > 0 && (
        <div className="mt-4 rounded-2xl border border-amber-900/50 bg-amber-950/20 p-4 text-sm text-amber-200">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Phát hiện vị thế âm từ trade report thiếu đầu kỳ
          </div>
          <div className="mt-2 text-xs text-amber-100/80">
            Gợi ý cần bổ sung opening positions cho: {oversoldSuggestions.map((item) => `${item.ticker} ${Math.abs(item.totalShares)}`).join(', ')}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-3 md:grid-cols-3">
            <input
              value={row.ticker}
              onChange={(e) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ticker: e.target.value } : item))}
              placeholder="Ticker"
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
            />
            <input
              value={row.quantity}
              onChange={(e) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: e.target.value } : item))}
              placeholder="Số lượng"
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
            />
            <input
              value={row.averageCost}
              onChange={(e) => setRows((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, averageCost: e.target.value } : item))}
              placeholder="Giá vốn bình quân"
              className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setRows((current) => [...current, { ticker: '', quantity: '', averageCost: '' }])}
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900"
        >
          Thêm dòng
        </button>
        <button
          type="button"
          onClick={saveSnapshot}
          disabled={isPending || !cutoffDate}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Lưu snapshot
        </button>
        <button
          type="button"
          onClick={clearSnapshot}
          disabled={isPending}
          className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-900 disabled:opacity-50"
        >
          Xóa snapshot
        </button>
      </div>
    </div>
  );
}
