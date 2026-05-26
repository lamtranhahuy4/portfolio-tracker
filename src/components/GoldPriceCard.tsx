'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TrendingUp, RefreshCw, BarChart3 } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { GoldPriceItem, GoldHistoryPoint } from '@/lib/goldPriceService';
import { DashboardLanguage, DASHBOARD_LANGUAGE_STORAGE_KEY } from '@/lib/dashboardLocale';

const copy = {
  vi: {
    title: 'Giá vàng',
    buy: 'Mua',
    sell: 'Bán',
    change: 'T/h',
    refresh: 'Làm mới',
    loading: 'Đang tải...',
    noData: 'Chưa có dữ liệu giá vàng.',
    chartTitle: 'Biểu đồ giá',
    chart7d: '7 ngày',
    chart30d: '30 ngày',
    noChartData: 'Chưa có dữ liệu biểu đồ.',
  },
  en: {
    title: 'Gold Price',
    buy: 'Buy',
    sell: 'Sell',
    change: 'Chg',
    refresh: 'Refresh',
    loading: 'Loading...',
    noData: 'No gold price data available.',
    chartTitle: 'Price Chart',
    chart7d: '7 days',
    chart30d: '30 days',
    noChartData: 'No chart data available.',
  },
};

const GOLD_TYPES = [
  { type: 'SJL1L10', label: 'SJC 9999' },
  { type: 'XAUUSD', label: 'World Gold (XAU/USD)' },
  { type: 'SJ9999', label: 'SJC Ring' },
  { type: 'DOHNL', label: 'DOJI Hanoi' },
  { type: 'BT9999NTT', label: 'Bao Tin 9999' },
];

function formatPrice(value: number, currency: string): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }
  return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

interface Props {
  initialPrices: GoldPriceItem[];
}

export default function GoldPriceCard({ initialPrices }: Props) {
  const [language, setLanguage] = useState<DashboardLanguage>('vi');
  const [prices, setPrices] = useState<GoldPriceItem[]>(initialPrices);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState('SJL1L10');
  const [history, setHistory] = useState<GoldHistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDays, setHistoryDays] = useState(30);

  useEffect(() => {
    const stored = localStorage.getItem(DASHBOARD_LANGUAGE_STORAGE_KEY);
    if (stored === 'vi' || stored === 'en') setLanguage(stored);
  }, []);

  const t = copy[language];

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/gold');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.prices) {
          setPrices(json.prices);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (type: string, days: number) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/gold?type=${type}&days=${days}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.history) {
          const points: GoldHistoryPoint[] = json.history
            .sort((a: any, b: any) => a.date.localeCompare(b.date));
          setHistory(points);
        }
      }
    } catch {} finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(selectedType, historyDays);
  }, [selectedType, historyDays, fetchHistory]);

  const selected = prices.find((p) => p.type === selectedType);

  const chartData = useMemo(() => {
    return history.map((p) => ({
      date: p.date.slice(5),
      buy: p.buy,
      sell: p.sell,
    }));
  }, [history]);

  return (
    <section className="rounded-[28px] border border-slate-800/80 bg-slate-900/60 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          {t.title}
        </h2>
        <button
          onClick={fetchPrices}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t.refresh}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        {GOLD_TYPES.map((gt) => (
          <button
            key={gt.type}
            onClick={() => setSelectedType(gt.type)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedType === gt.type
                ? 'bg-emerald-600/20 text-emerald-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {gt.label}
          </button>
        ))}
      </div>

      {selected ? (
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">{t.buy}</p>
            <p className="text-lg font-semibold text-emerald-300">
              {formatPrice(selected.buy, selected.currency)}
            </p>
            <p className={`text-xs ${selected.changeBuy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {selected.changeBuy >= 0 ? '+' : ''}{formatPrice(selected.changeBuy, selected.currency)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">{t.sell}</p>
            <p className="text-lg font-semibold text-rose-300">
              {formatPrice(selected.sell, selected.currency)}
            </p>
            <p className={`text-xs ${selected.changeSell >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {selected.changeSell >= 0 ? '+' : ''}{formatPrice(selected.changeSell, selected.currency)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-800/40 px-4 py-3">
            <p className="text-[11px] uppercase tracking-wider text-slate-500">{t.change}</p>
            <p className={`text-lg font-semibold ${selected.changeBuy >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {selected.changeBuy >= 0 ? '+' : ''}
              {((selected.changeBuy / (selected.buy - selected.changeBuy)) * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      ) : !loading && prices.length === 0 ? (
        <p className="mt-4 text-center text-sm text-slate-500">{t.noData}</p>
      ) : null}

      <div className="mt-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <BarChart3 className="h-4 w-4 text-emerald-400" />
          {t.chartTitle}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setHistoryDays(7)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              historyDays === 7
                ? 'bg-emerald-600/20 text-emerald-300'
                : 'border border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.chart7d}
          </button>
          <button
            onClick={() => setHistoryDays(30)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              historyDays === 30
                ? 'bg-emerald-600/20 text-emerald-300'
                : 'border border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.chart30d}
          </button>
        </div>
      </div>

      {historyLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
        </div>
      ) : chartData.length > 1 ? (
        <div className="mt-2 h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#334155' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#334155' }} tickFormatter={(v: number) => formatPrice(v, selected?.currency ?? 'VND')} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #334155', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)', backgroundColor: 'rgba(15, 23, 42, 0.92)', color: '#e2e8f0' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Line type="monotone" dataKey="buy" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#10b981' }} name={t.buy} />
              <Line type="monotone" dataKey="sell" stroke="#f43f5e" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#f43f5e' }} name={t.sell} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-slate-500">{t.noChartData}</p>
      )}
    </section>
  );
}
