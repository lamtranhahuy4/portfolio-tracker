'use client';

import { useEffect, useState } from 'react';
import { Receipt, Loader2 } from 'lucide-react';
import { DashboardLanguage } from '@/lib/dashboardLocale';
import { cn } from '@/components/MarkToMarketGrid';

interface TaxResult {
  ticker: string;
  totalQuantitySold: number;
  totalCostBasis: number;
  totalProceeds: number;
  grossProfit: number;
  taxAmount: number;
  netProfit: number;
}

interface TaxSummaryData {
  totalProceeds: number;
  totalCostBasis: number;
  totalGrossProfit: number;
  totalTaxAmount: number;
  totalNetProfit: number;
  taxRate: number;
  byTicker: TaxResult[];
}

interface TaxSummaryCardProps {
  language: DashboardLanguage;
}

const copy = {
  vi: {
    title: 'Tính thuế Realized P&L',
    desc: 'Tính toán thuế thu nhập cá nhân từ lãi chứng khoán đã chốt (bán)',
    loading: 'Đang tính toán...',
    noData: 'Chưa có giao dịch bán',
    proceeds: 'Tổng thu',
    costBasis: 'Tổng giá vốn',
    grossProfit: 'Lãi gộp',
    tax: 'Thuế phải nộp',
    netProfit: 'Lãi sau thuế',
    byTicker: 'Chi tiết theo mã',
    ticker: 'Mã',
    quantity: 'SL bán',
    sell: 'Giá bán',
    taxRate: 'Thuế suất',
  },
  en: {
    title: 'Realized P&L Tax',
    desc: 'Calculate personal income tax from realized stock profits (sold)',
    loading: 'Calculating...',
    noData: 'No sell transactions',
    proceeds: 'Total Proceeds',
    costBasis: 'Total Cost Basis',
    grossProfit: 'Gross Profit',
    tax: 'Tax Due',
    netProfit: 'Net Profit',
    byTicker: 'By Ticker',
    ticker: 'Ticker',
    quantity: 'Qty Sold',
    sell: 'Sell Price',
    taxRate: 'Tax Rate',
  },
};

const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value);

const formatNumber = (value: number) => new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 2,
}).format(value);

export default function TaxSummaryCard({ language }: TaxSummaryCardProps) {
  const [data, setData] = useState<TaxSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const t = copy[language];

  useEffect(() => {
    const fetchTax = async () => {
      try {
        const res = await fetch('/api/tax-calculation');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Failed to fetch tax calculation:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTax();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30">
            <Receipt className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200">{t.title}</h3>
            <p className="text-sm text-slate-400">{t.loading}</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      </div>
    );
  }

  if (!data || data.byTicker.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30">
            <Receipt className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200">{t.title}</h3>
            <p className="text-sm text-slate-400">{t.noData}</p>
          </div>
        </div>
        <p className="text-sm text-slate-500">{t.desc}</p>
      </div>
    );
  }

  const taxRatePercent = (data.taxRate * 100).toFixed(3);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30">
          <Receipt className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-200">{t.title}</h3>
          <p className="text-sm text-slate-400">{t.desc}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="rounded-xl bg-slate-950/50 p-3 border border-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-wide">{t.proceeds}</p>
          <p className="text-lg font-bold text-slate-200">{formatCurrency(data.totalProceeds)}</p>
        </div>
        <div className="rounded-xl bg-slate-950/50 p-3 border border-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-wide">{t.costBasis}</p>
          <p className="text-lg font-bold text-slate-200">{formatCurrency(data.totalCostBasis)}</p>
        </div>
        <div className="rounded-xl bg-slate-950/50 p-3 border border-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-wide">{t.grossProfit}</p>
          <p className={cn('text-lg font-bold', data.totalGrossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
            {data.totalGrossProfit > 0 ? '+' : ''}{formatCurrency(data.totalGrossProfit)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-950/50 p-3 border border-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-wide">{t.tax}</p>
          <p className="text-lg font-bold text-amber-400">{formatCurrency(data.totalTaxAmount)}</p>
          <p className="text-xs text-slate-500">{taxRatePercent}%</p>
        </div>
        <div className="rounded-xl bg-slate-950/50 p-3 border border-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-wide">{t.netProfit}</p>
          <p className={cn('text-lg font-bold', data.totalNetProfit >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
            {data.totalNetProfit > 0 ? '+' : ''}{formatCurrency(data.totalNetProfit)}
          </p>
        </div>
      </div>

      {data.byTicker.length > 0 && (
        <div className="mt-2 pt-4 border-t border-slate-800">
          <p className="text-sm font-medium text-slate-400 mb-3">{t.byTicker}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500 uppercase">
                <tr className="border-b border-slate-800">
                  <th className="text-left py-2 px-3">{t.ticker}</th>
                  <th className="text-right py-2 px-3">{t.quantity}</th>
                  <th className="text-right py-2 px-3">{t.costBasis}</th>
                  <th className="text-right py-2 px-3">{t.proceeds}</th>
                  <th className="text-right py-2 px-3">{t.grossProfit}</th>
                  <th className="text-right py-2 px-3">{t.tax}</th>
                  <th className="text-right py-2 px-3">{t.netProfit}</th>
                </tr>
              </thead>
              <tbody>
                {data.byTicker.map((item) => (
                  <tr key={item.ticker} className="border-b border-slate-800/50">
                    <td className="py-2 px-3 font-bold text-slate-200">{item.ticker}</td>
                    <td className="py-2 px-3 text-right text-slate-300">{formatNumber(item.totalQuantitySold)}</td>
                    <td className="py-2 px-3 text-right text-slate-300">{formatCurrency(item.totalCostBasis)}</td>
                    <td className="py-2 px-3 text-right text-slate-300">{formatCurrency(item.totalProceeds)}</td>
                    <td className={cn('py-2 px-3 text-right', item.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                      {item.grossProfit > 0 ? '+' : ''}{formatCurrency(item.grossProfit)}
                    </td>
                    <td className="py-2 px-3 text-right text-amber-400">{formatCurrency(item.taxAmount)}</td>
                    <td className={cn('py-2 px-3 text-right font-bold', item.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
                      {item.netProfit > 0 ? '+' : ''}{formatCurrency(item.netProfit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}