'use client';

import { Wallet } from 'lucide-react';
import { usePortfolioMetrics, usePortfolioStore } from '@/store/usePortfolioStore';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string | Date) {
  if (!value) return 'N/A';
  return new Intl.DateTimeFormat('vi-VN').format(new Date(value));
}

export default function CashLedgerStatusCard() {
  const metrics = usePortfolioMetrics();
  const lastCashImportSummary = usePortfolioStore((state) => state.lastCashImportSummary);

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Cash Ledger</h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {metrics.cashBalanceSource === 'ledger'
              ? 'NAV đang dùng số dư tiền thực tế từ báo cáo DNSE.'
              : 'NAV đang dùng số dư tiền suy diễn từ trade report.'}
          </p>
        </div>
        <div className={`rounded-xl p-2 ${metrics.cashBalanceSource === 'ledger'
          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-300'}`}>
          <Wallet className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-gray-50 dark:bg-gray-950/60 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Nguồn số dư</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
            {metrics.cashBalanceSource === 'ledger' ? 'Ledger' : 'Derived'}
          </div>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-950/60 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Số dư cuối ngày</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
            {metrics.cashBalanceEOD !== undefined ? formatCurrency(metrics.cashBalanceEOD) : 'N/A'}
          </div>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-950/60 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Coverage</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
            {metrics.cashLedgerCoverageStart
              ? `${formatDate(metrics.cashLedgerCoverageStart)} - ${formatDate(metrics.cashLedgerCoverageEnd)}`
              : 'Chưa có'}
          </div>
        </div>
        <div className="rounded-xl bg-gray-50 dark:bg-gray-950/60 px-3 py-2">
          <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Import gần nhất</div>
          <div className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
            {lastCashImportSummary ? `${lastCashImportSummary.totalEvents} events` : 'Chưa có'}
          </div>
        </div>
      </div>

      {lastCashImportSummary && (
        <div className="mt-4 rounded-xl border border-gray-200 dark:border-gray-800 px-3 py-3 text-xs text-gray-600 dark:text-gray-300">
          <div className="font-medium text-gray-900 dark:text-gray-100">{lastCashImportSummary.fileName}</div>
          <div className="mt-1">
            Đã nhập lúc {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(lastCashImportSummary.importedAt)}
          </div>
          <div className="mt-1">Chưa phân loại rõ: {lastCashImportSummary.unclassifiedEvents}</div>
        </div>
      )}
    </div>
  );
}
