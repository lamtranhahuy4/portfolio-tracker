'use client';

import React, { useMemo, useState } from 'react';
import { History } from 'lucide-react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { groupTransactionsByDay } from '@/lib/portfolioMetrics';
import { DashboardLanguage } from '@/lib/dashboardLocale';

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

function getTxBadge(type: string, language: DashboardLanguage) {
  if (type === 'BUY') return { label: language === 'vi' ? 'MUA' : 'BUY', className: 'bg-emerald-500/20 text-emerald-400' };
  if (type === 'SELL') return { label: language === 'vi' ? 'BÁN' : 'SELL', className: 'bg-rose-500/20 text-rose-400' };
  if (type === 'DEPOSIT') return { label: language === 'vi' ? 'NẠP' : 'DEPOSIT', className: 'bg-purple-500/20 text-purple-400' };
  if (type === 'WITHDRAW') return { label: language === 'vi' ? 'RÚT' : 'WITHDRAW', className: 'bg-purple-500/20 text-purple-400' };
  return { label: type, className: 'bg-purple-500/20 text-purple-400' };
}

const copy = {
  vi: {
    emptyTitle: 'Chưa có dữ liệu giao dịch',
    emptyDesc: 'Vui lòng tải lên file CSV/XLSX để hệ thống bắt đầu dựng lịch sử danh mục.',
    tradeCount: 'giao dịch',
    grossValue: 'Giá trị gộp trong ngày',
    tradeDate: 'Ngày giao dịch',
    ticker: 'Mã',
    type: 'Loại',
    quantity: 'Khối lượng',
    price: 'Giá',
    total: 'Tổng tiền',
    showing: 'Hiển thị',
    dayGroups: 'ngày giao dịch trên tổng',
    previous: 'Trước',
    next: 'Sau',
  },
  en: {
    emptyTitle: 'No transaction data yet',
    emptyDesc: 'Upload a CSV/XLSX file so the system can build your trading history.',
    tradeCount: 'transactions',
    grossValue: 'Gross value for the day',
    tradeDate: 'Trade Date',
    ticker: 'Ticker',
    type: 'Type',
    quantity: 'Quantity',
    price: 'Price',
    total: 'Total',
    showing: 'Showing',
    dayGroups: 'trading days out of',
    previous: 'Previous',
    next: 'Next',
  },
} satisfies Record<DashboardLanguage, Record<string, string>>;

export default function GroupedTransactionHistoryTable({ language }: { language: DashboardLanguage }) {
  const t = copy[language];
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
            <h3 className="text-lg font-bold text-slate-100">{t.emptyTitle}</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">{t.emptyDesc}</p>
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
                <p className="text-sm text-slate-400">{group.count} {t.tradeCount}</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-slate-500">{t.grossValue}</p>
                <p className="text-sm font-semibold text-slate-100">{formatCurrency(group.dayGrossValue)}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">{t.tradeDate}</th>
                    <th className="px-6 py-3 text-left font-semibold">{t.ticker}</th>
                    <th className="px-6 py-3 text-left font-semibold">{t.type}</th>
                    <th className="px-6 py-3 text-right font-semibold">{t.quantity}</th>
                    <th className="px-6 py-3 text-right font-semibold">{t.price}</th>
                    <th className="px-6 py-3 text-right font-semibold">{t.total}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {group.items.map((tx) => {
                    const badge = getTxBadge(tx.type, language);
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
          {t.showing} {currentGroups.length} {t.dayGroups} {groupedDays.length}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={safeCurrentPage === 1}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-slate-200 transition-all hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-40"
          >
            {t.previous}
          </button>
          <span className="text-sm font-semibold text-slate-300">{safeCurrentPage} / {Math.max(totalPages, 1)}</span>
          <button
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={safeCurrentPage === totalPages || totalPages === 0}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-1.5 text-sm font-semibold text-slate-200 transition-all hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-40"
          >
            {t.next}
          </button>
        </div>
      </div>
    </div>
  );
}
