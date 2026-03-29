'use client';

import React, { useMemo, useState } from 'react';
import { Holding } from '../types/portfolio';
import { Pencil, Check, X, Search } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { DashboardLanguage } from '@/lib/dashboardLocale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface MarkToMarketGridProps {
  holdings: Holding[];
  onPriceChange: (ticker: string, newPrice: number) => void;
  language: DashboardLanguage;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value);

const formatGrossPrice = (value: number) => {
  const step10 = Math.floor(value / 10) * 10;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(step10);
};

const formatNumber = (value: number) => new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 2,
}).format(value);

const formatPercent = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'percent',
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
}).format(value);

const copy = {
  vi: {
    badgeSymbols: 'Số mã',
    badgeProfit: 'Đang lãi',
    badgeLoss: 'Đang lỗ',
    badgeCash: 'Tiền mặt',
    ticker: 'Mã (Ticker)',
    assetClass: 'Phân loại',
    quantity: 'Khối lượng',
    avgPrice: 'Giá mua TB',
    currentPrice: 'Giá hiện tại',
    marketValue: 'Giá trị thị trường',
    unrealized: 'Lãi/Lỗ chưa chốt',
    save: 'Lưu',
    cancel: 'Hủy',
    editPrice: 'Sửa giá thị trường',
    noDataTitle: 'Chưa có dữ liệu danh mục',
    noDataDesc: 'Hãy nạp file CSV hoặc thêm giao dịch đầu tiên.',
  },
  en: {
    badgeSymbols: 'Symbols',
    badgeProfit: 'Winners',
    badgeLoss: 'Losers',
    badgeCash: 'Cash',
    ticker: 'Ticker',
    assetClass: 'Class',
    quantity: 'Quantity',
    avgPrice: 'Avg Cost',
    currentPrice: 'Current Price',
    marketValue: 'Market Value',
    unrealized: 'Unrealized P&L',
    save: 'Save',
    cancel: 'Cancel',
    editPrice: 'Edit market price',
    noDataTitle: 'No portfolio data yet',
    noDataDesc: 'Upload a CSV file or add the first transaction.',
  },
} satisfies Record<DashboardLanguage, Record<string, string>>;

export default function MarkToMarketGrid({ holdings, onPriceChange, language }: MarkToMarketGridProps) {
  const t = copy[language];
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const sortedHoldings = useMemo(() => [...holdings].sort((a, b) => b.marketValue - a.marketValue), [holdings]);
  const holdingSummary = useMemo(() => {
    const nonCash = sortedHoldings.filter((holding) => holding.ticker !== 'CASH_VND');
    return {
      activeTickers: nonCash.length,
      profitableTickers: nonCash.filter((holding) => holding.unrealizedPnL > 0).length,
      losingTickers: nonCash.filter((holding) => holding.unrealizedPnL < 0).length,
      cashValue: sortedHoldings.find((holding) => holding.ticker === 'CASH_VND')?.marketValue ?? 0,
    };
  }, [sortedHoldings]);

  const handleEditClick = (ticker: string, currentPrice: number) => {
    setEditingTicker(ticker);
    setEditValue(currentPrice.toString());
  };

  const handleSave = (ticker: string) => {
    const val = parseFloat(editValue);
    if (!Number.isNaN(val) && val >= 0) {
      onPriceChange(ticker, val);
    }
    setEditingTicker(null);
  };

  const handleCancel = () => {
    setEditingTicker(null);
    setEditValue('');
  };

  return (
    <div className="w-full overflow-hidden rounded-[28px] border border-slate-800 bg-slate-900/60 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="border-b border-slate-800 bg-slate-950/40 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <SummaryBadge label={t.badgeSymbols} value={holdingSummary.activeTickers.toString()} />
          <SummaryBadge label={t.badgeProfit} value={holdingSummary.profitableTickers.toString()} positive />
          <SummaryBadge label={t.badgeLoss} value={holdingSummary.losingTickers.toString()} negative />
          <SummaryBadge label={t.badgeCash} value={formatCurrency(holdingSummary.cashValue)} />
        </div>
      </div>
      <div className="h-96 overflow-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/95 font-semibold text-slate-400 backdrop-blur-sm">
            <tr>
              <th className="px-5 py-4 whitespace-nowrap">{t.ticker}</th>
              <th className="px-5 py-4 whitespace-nowrap">{t.assetClass}</th>
              <th className="px-5 py-4 whitespace-nowrap text-right">{t.quantity}</th>
              <th className="px-5 py-4 whitespace-nowrap text-right">{t.avgPrice}</th>
              <th className="px-5 py-4 whitespace-nowrap text-right">{t.currentPrice}</th>
              <th className="px-5 py-4 whitespace-nowrap text-right">{t.marketValue}</th>
              <th className="px-5 py-4 whitespace-nowrap text-right">{t.unrealized}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {sortedHoldings.map((h) => {
              const isEditing = editingTicker === h.ticker;
              const pnlPercent = h.unrealizedPnLPercent || 0;
              const pnlColorClass = h.unrealizedPnL > 0
                ? 'text-emerald-400'
                : h.unrealizedPnL < 0
                  ? 'text-rose-400'
                  : 'text-slate-400';

              return (
                <tr key={h.ticker} className="transition-colors odd:bg-slate-950/10 even:bg-slate-950/30 hover:bg-slate-800/30">
                  <td className="min-w-[120px] px-5 py-4 font-bold text-slate-100">
                    <div className="flex items-center gap-2">
                      {h.ticker}
                      {h.ticker !== 'CASH_VND' && (
                        <button
                          className="text-slate-500 transition-colors hover:text-indigo-400"
                          title={`Remaining Qty: ${h.totalShares}\nGross Price: ${formatGrossPrice(h.grossAveragePrice)}\nNet Cost: ${formatCurrency(h.netAverageCost)}\nTotal Net Basis: ${formatCurrency(h.totalShares * h.netAverageCost)}`}
                        >
                          <Search size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={cn(
                      'rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider',
                      h.assetClass === 'STOCK' ? 'bg-blue-500/15 text-blue-300' :
                      h.assetClass === 'CASH' ? 'bg-emerald-500/15 text-emerald-300' :
                      'bg-amber-500/15 text-amber-300'
                    )}>
                      {h.assetClass}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-medium text-slate-300">{formatNumber(h.totalShares)}</td>
                  <td className="px-5 py-4 text-right text-slate-400">{h.ticker === 'CASH_VND' ? '-' : formatGrossPrice(h.grossAveragePrice)}</td>
                  <td className="px-5 py-4 text-right">
                    {h.ticker === 'CASH_VND' ? (
                      <span className="text-slate-500">-</span>
                    ) : isEditing ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <input
                          type="number"
                          className="w-28 rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-right text-sm text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSave(h.ticker)}
                          autoFocus
                        />
                        <button onClick={() => handleSave(h.ticker)} className="rounded-md p-1.5 text-emerald-400 transition-colors hover:bg-emerald-500/10" title={t.save}>
                          <Check size={16} strokeWidth={2.5} />
                        </button>
                        <button onClick={handleCancel} className="rounded-md p-1.5 text-rose-400 transition-colors hover:bg-rose-500/10" title={t.cancel}>
                          <X size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    ) : (
                      <div className="group flex items-center justify-end gap-2">
                        <span className="font-semibold text-slate-100">{formatCurrency(h.currentPrice)}</span>
                        <button
                          onClick={() => handleEditClick(h.ticker, h.currentPrice)}
                          className="rounded-md p-1.5 text-slate-500 opacity-0 transition-all hover:bg-blue-500/10 hover:text-blue-300 group-hover:opacity-100"
                          title={t.editPrice}
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-slate-100">{formatCurrency(h.marketValue)}</td>
                  <td className={cn('px-5 py-4 text-right', pnlColorClass)}>
                    {h.ticker === 'CASH_VND' ? '-' : (
                      <div className="flex flex-col">
                        <span className="font-bold">{h.unrealizedPnL > 0 ? '+' : ''}{formatCurrency(h.unrealizedPnL)}</span>
                        <span className="mt-0.5 text-xs font-semibold opacity-90">{h.unrealizedPnL > 0 ? '+' : ''}{formatPercent(pnlPercent)}</span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {holdings.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800">
                      <span className="text-xl">P</span>
                    </div>
                    <p className="text-base font-medium">{t.noDataTitle}</p>
                    <p className="text-sm">{t.noDataDesc}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryBadge({
  label,
  value,
  positive,
  negative,
}: {
  label: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 font-medium ring-1',
        positive && 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/20',
        negative && 'bg-rose-500/10 text-rose-300 ring-rose-500/20',
        !positive && !negative && 'bg-slate-950/80 text-slate-300 ring-slate-800'
      )}
    >
      <span className="text-xs uppercase tracking-wide opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
