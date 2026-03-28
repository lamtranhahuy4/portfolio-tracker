'use client';

import React, { useMemo, useState } from 'react';
import { Holding } from '../types/portfolio';
import { Pencil, Check, X, Search } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility để nối các class Tailwind gọn gàng (shadcn/ui style) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface MarkToMarketGridProps {
  holdings: Holding[];
  /** Hàm callback khi người dùng inline-edit giá trên Ticker */
  onPriceChange: (ticker: string, newPrice: number) => void;
}

// Format tiền VND
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

// Format giá mua trung bình chuẩn DNSE (bước giá 10đ)
const formatGrossPrice = (value: number) => {
  const step10 = Math.floor(value / 10) * 10;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(step10);
};

// Format số lượng (shares)
const formatNumber = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 2,
  }).format(value);
};

// Format phần trăm +- %
const formatPercent = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'percent',
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero'
  }).format(value);
};

export default function MarkToMarketGrid({ holdings, onPriceChange }: MarkToMarketGridProps) {
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const sortedHoldings = useMemo(
    () => [...holdings].sort((a, b) => b.marketValue - a.marketValue),
    [holdings]
  );
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
    if (!isNaN(val) && val >= 0) {
      onPriceChange(ticker, val);
    }
    setEditingTicker(null);
  };

  const handleCancel = () => {
    setEditingTicker(null);
    setEditValue('');
  };

  return (
    <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-950 overflow-hidden">
      <div className="border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/60 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <SummaryBadge label="Số mã" value={holdingSummary.activeTickers.toString()} />
          <SummaryBadge label="Đang lãi" value={holdingSummary.profitableTickers.toString()} positive />
          <SummaryBadge label="Đang lỗ" value={holdingSummary.losingTickers.toString()} negative />
          <SummaryBadge label="Tiền mặt" value={formatCurrency(holdingSummary.cashValue)} />
        </div>
      </div>
      <div className="max-h-[480px] overflow-auto">
      <table className="w-full min-w-[920px] text-sm text-left">
        <thead className="sticky top-0 z-10 bg-gray-50/95 dark:bg-gray-900/95 text-gray-600 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-800 backdrop-blur-sm">
          <tr>
            <th className="px-5 py-4 whitespace-nowrap">Mã (Ticker)</th>
            <th className="px-5 py-4 whitespace-nowrap">Phân loại</th>
            <th className="px-5 py-4 whitespace-nowrap text-right">Khối lượng</th>
            <th className="px-5 py-4 whitespace-nowrap text-right">Giá mua trung bình</th>
            <th className="px-5 py-4 whitespace-nowrap text-right">Giá HT (Cập nhật)</th>
            <th className="px-5 py-4 whitespace-nowrap text-right">Giá trị thị trường</th>
            <th className="px-5 py-4 whitespace-nowrap text-right">Lãi/Lỗ chưa chốt</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
          {sortedHoldings.map((h) => {
            const isEditing = editingTicker === h.ticker;
            
            // Tính toán logic % PnL cục bộ cho UI
            const pnlPercent = h.unrealizedPnLPercent || 0;
            
            // Dynamic text colors for Profit and Loss
            const pnlColorClass = h.unrealizedPnL > 0 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : h.unrealizedPnL < 0 
                ? 'text-rose-600 dark:text-rose-500' 
                : 'text-gray-500 dark:text-gray-400';

            return (
              <tr 
                key={h.ticker} 
                className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors"
              >
                {/* Ticker Column */}
                <td className="px-5 py-4 font-bold text-gray-900 dark:text-gray-100 min-w-[120px]">
                  <div className="flex items-center gap-2">
                    {h.ticker}
                    {h.ticker !== 'CASH_VND' && (
                      <button
                        className="text-gray-400 hover:text-indigo-500 transition-colors"
                        title={`--- DEBUG INFO ---\nRemaining Qty: ${h.totalShares}\nGross Price: ${formatGrossPrice(h.grossAveragePrice)} (Raw: ${h.grossAveragePrice.toFixed(2)})\nNet Cost: ${formatCurrency(h.netAverageCost)}\nTotal Net Basis: ${formatCurrency(h.totalShares * h.netAverageCost)}`}
                      >
                        <Search size={14} />
                      </button>
                    )}
                  </div>
                </td>
                
                {/* Asset Class Column */}
                <td className="px-5 py-4">
                  <span className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] uppercase font-bold tracking-wider",
                    h.assetClass === 'STOCK' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" :
                    h.assetClass === 'CASH' ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400" :
                    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400"
                  )}>
                    {h.assetClass}
                  </span>
                </td>
                
                {/* Quantity Column */}
                <td className="px-5 py-4 text-right font-medium text-gray-700 dark:text-gray-300">
                  {formatNumber(h.totalShares)}
                </td>
                
                {/* Average Cost Column */}
                <td className="px-5 py-4 text-right text-gray-700 dark:text-gray-400">
                  {h.ticker === 'CASH_VND' ? '-' : formatGrossPrice(h.grossAveragePrice)}
                </td>
                
                {/* Current Price (Inline Edit) Column */}
                <td className="px-5 py-4 text-right">
                  {h.ticker === 'CASH_VND' ? (
                    <span className="text-gray-400">-</span>
                  ) : isEditing ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <input
                        type="number"
                        className="w-28 px-2 py-1.5 text-right text-sm border rounded-md shadow-sm bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave(h.ticker)}
                        autoFocus
                      />
                      <button 
                        onClick={() => handleSave(h.ticker)} 
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-md transition-colors"
                        title="Lưu"
                      >
                        <Check size={16} strokeWidth={2.5} />
                      </button>
                      <button 
                        onClick={handleCancel} 
                        className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-md transition-colors"
                        title="Hủy"
                      >
                        <X size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2 group">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(h.currentPrice)}
                      </span>
                      <button 
                        onClick={() => handleEditClick(h.ticker, h.currentPrice)}
                        className="p-1.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-all hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md"
                        title="Sửa giá thị trường"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )}
                </td>
                
                {/* Market Value Column */}
                <td className="px-5 py-4 text-right font-bold text-gray-900 dark:text-white">
                  {formatCurrency(h.marketValue)}
                </td>
                
                {/* Unrealized PnL Column */}
                <td className={cn("px-5 py-4 text-right", pnlColorClass)}>
                  {h.ticker === 'CASH_VND' ? '-' : (
                    <div className="flex flex-col">
                      <span className="font-bold">
                        {h.unrealizedPnL > 0 ? '+' : ''}{formatCurrency(h.unrealizedPnL)}
                      </span>
                      <span className="text-xs font-semibold opacity-90 mt-0.5">
                        {h.unrealizedPnL > 0 ? '+' : ''}{formatPercent(pnlPercent)}
                      </span>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
          
          {/* Empty State */}
          {holdings.length === 0 && (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center text-gray-500 dark:text-gray-400">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2">
                    <span className="text-xl">📊</span>
                  </div>
                  <p className="font-medium text-base">Chưa có dữ liệu danh mục</p>
                  <p className="text-sm">Hãy nạp file CSV hoặc thêm giao dịch đầu tiên.</p>
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
        positive && 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900',
        negative && 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900',
        !positive && !negative && 'bg-white text-gray-700 ring-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:ring-gray-800'
      )}
    >
      <span className="text-xs uppercase tracking-wide opacity-70">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
