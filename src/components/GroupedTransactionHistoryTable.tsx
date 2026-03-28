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
      <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gray-50/50 dark:bg-gray-800/20 max-w-full" />
        <div className="flex flex-col items-center justify-center gap-4 relative z-10">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-400 dark:text-gray-500 shadow-inner">
            <History className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Chưa có dữ liệu giao dịch</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-sm mx-auto">
              Vui lòng tải lên file CSV/XLSX để hệ thống bắt đầu dựng lịch sử danh mục.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="divide-y divide-gray-200 dark:divide-gray-800">
        {currentGroups.map((group) => (
          <section key={group.dateKey}>
            <div className="bg-gray-50/80 dark:bg-gray-900/70 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{group.displayDate}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {group.count} giao dịch
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Gross value trong ngày</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(group.dayGrossValue)}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Ngày giao dịch</th>
                    <th className="px-6 py-3 text-left font-semibold">Mã</th>
                    <th className="px-6 py-3 text-left font-semibold">Loại</th>
                    <th className="px-6 py-3 text-right font-semibold">Khối lượng</th>
                    <th className="px-6 py-3 text-right font-semibold">Giá</th>
                    <th className="px-6 py-3 text-right font-semibold">Tổng tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
                  {group.items.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{group.displayDate}</td>
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">{tx.ticker}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider inline-flex items-center ${
                          tx.type === 'BUY'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400'
                            : tx.type === 'SELL'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'
                              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-400'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900 dark:text-gray-100">{formatNumber(tx.quantity)}</td>
                      <td className="px-6 py-4 text-right text-gray-700 dark:text-gray-300">{formatCurrency(tx.price)}</td>
                      <td className="px-6 py-4 text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(tx.totalValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>

      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/60 dark:bg-gray-900/60">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Hiển thị {currentGroups.length} ngày giao dịch trên tổng {groupedDays.length} ngày
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={safeCurrentPage === 1}
            className="px-3.5 py-1.5 text-sm font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 transition-all disabled:opacity-40 disabled:pointer-events-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Trước
          </button>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{safeCurrentPage} / {Math.max(totalPages, 1)}</span>
          <button
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={safeCurrentPage === totalPages || totalPages === 0}
            className="px-3.5 py-1.5 text-sm font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 transition-all disabled:opacity-40 disabled:pointer-events-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
}
