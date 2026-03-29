'use client';

import React, { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { groupTransactionsByDay } from '@/lib/portfolioMetrics';

const GROUPS_PER_PAGE = 10;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 4 }).format(value);
}

function getTxBadge(type: string) {
  if (type === 'BUY') return { label: 'MUA', className: 'bg-emerald-500/20 text-emerald-400' };
  if (type === 'SELL') return { label: 'BAN', className: 'bg-rose-500/20 text-rose-400' };
  if (type === 'DEPOSIT') return { label: 'NAP', className: 'bg-purple-500/20 text-purple-400' };
  if (type === 'WITHDRAW') return { label: 'RUT', className: 'bg-purple-500/20 text-purple-400' };
  return { label: type, className: 'bg-purple-500/20 text-purple-400' };
}

export default function GroupedTransactionHistoryTable() {
  const transactions = usePortfolioStore((state) => state.transactions);
  const [currentPage, setCurrentPage] = useState(1);

  const groupedDays = useMemo(() => groupTransactionsByDay(transactions), [transactions]);
  const totalPages = Math.ceil(groupedDays.length / GROUPS_PER_PAGE);
  const safeCurrentPage = Math.min(currentPage, totalPages > 0 ? totalPages : 1);
  const currentGroups = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * GROUPS_PER_PAGE;
    return groupedDays.slice(startIndex, startIndex + GROUPS_PER_PAGE);
  }, [groupedDays, safeCurrentPage]);

  if (transactions.length === 0) {
    return (
      <div className="relative w-full overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900/60 p-12 text-center shadow-xl shadow-black/20">
        <div className="absolute inset-0 max-w-full bg-slate-950/20" />
        <div className="relative z-10 flex flex-col items-center justify-center gap-4">
          <div className="rounded-full bg-slate-800 p-4 text-slate-500 shadow-inner">
            <History className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Chua co du lieu giao dich</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
              Vui long tai len file CSV/XLSX de he thong bat dau dung lich su danh muc.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900/60 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="space-y-4 p-4">
        {currentGroups.map((group) => (
          <section key={group.dateKey} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/30">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/60 px-6 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">{group.displayDate}</h3>
                <p className="text-sm text-slate-400">{group.count} giao dich</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-slate-500">Gross value trong ngay</p>
                <p className="text-sm font-semibold text-slate-100">{formatCurrency(group.dayGrossValue)}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Ngay giao dich</th>
                    <th className="px-6 py-3 text-left font-semibold">Ma</th>
                    <th className="px-6 py-3 text-left font-semibold">Loai</th>
                    <th className="px-6 py-3 text-right font-semibold">Khoi luong</th>
                    <th className="px-6 py-3 text-right font-semibold">Gia</th>
                    <th className="px-6 py-3 text-right font-semibold">Tong tien</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {group.items.map((tx) => {
                    const badge = getTxBadge(tx.type);
                    return (
                      <tr key={tx.id} className="transition-colors hover:bg-slate-800/30">
                        <td className="px-6 py-4 text-slate-400">{group.displayDate}</td>
                        <td className="px-6 py-4 font-semibold text-slate-100">{tx.ticker}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-[11px] font-bold tracking-wider ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-100">{formatNumber(tx.quantity)}</td>
                        <td className="px-6 py-4 text-right text-slate-300">{formatCurrency(tx.price)}</td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-100">{formatCurrency(tx.totalValue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/40 px-6 py-4">
        <span className="text-sm text-slate-400">
          Hien thi {currentGroups.length} ngay giao dich tren tong {groupedDays.length} ngay
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={safeCurrentPage === 1}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-slate-200 transition-all hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-40"
          >
            Truoc
          </button>
          <span className="text-sm font-semibold text-slate-300">{safeCurrentPage} / {Math.max(totalPages, 1)}</span>
          <button
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={safeCurrentPage === totalPages || totalPages === 0}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-slate-200 transition-all hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
