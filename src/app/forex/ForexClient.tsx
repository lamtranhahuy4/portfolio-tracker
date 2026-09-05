'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, RefreshCw, TrendingUp, Wallet, BarChart3, Globe, Download, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { ForexResponse, ForexHistoryPoint } from '@/lib/foreignExchangeService';
import { DashboardLanguage, DASHBOARD_LANGUAGE_STORAGE_KEY } from '@/lib/dashboardLocale';
import { downloadCsv } from '@/lib/exportCsv';
import { cn } from '@/lib/utils';
import ForexConverter from '@/components/ForexConverter';
import GoldPriceCard from '@/components/GoldPriceCard';

const copy = {
  vi: {
    title: 'Tỷ giá ngoại tệ',
    subtitle: 'Cập nhật từ Vietcombank, Frankfurter & Vang.Today',
    back: 'Trở lại Bảng điều khiển',
    vndTab: 'Tỷ giá VND',
    intlTab: 'Quốc tế',
    goldTab: 'Giá vàng',
    converterTab: 'Converter',
    refresh: 'Làm mới',
    loading: 'Đang tải...',
    error: 'Không thể tải dữ liệu tỷ giá.',
    retry: 'Thử lại',
    lastUpdate: 'Cập nhật lúc',
    code: 'Mã',
    buyCash: 'Mua TM',
    buyTransfer: 'Mua CK',
    sell: 'Bán ra',
    rate: 'Tỷ giá',
    chartTitle: 'Biểu đồ lịch sử',
    chart7d: '7 ngày',
    chart30d: '30 ngày',
    noChart: 'Chọn một cặp tỷ giá để xem biểu đồ.',
    noChartNoData: 'Không có đủ dữ liệu lịch sử để vẽ biểu đồ.',
    noChartVnd: 'Dữ liệu lịch sử sẽ được tích luỹ dần từ các snapshot hàng ngày.',
    exportCsv: 'Export CSV',
    selecting: 'Đang chọn',
  },
  en: {
    title: 'Foreign Exchange Rates',
    subtitle: 'Powered by Vietcombank, Frankfurter & Vang.Today',
    back: 'Back to Dashboard',
    vndTab: 'VND Rates',
    intlTab: 'International',
    goldTab: 'Gold',
    converterTab: 'Converter',
    refresh: 'Refresh',
    loading: 'Loading...',
    error: 'Failed to load exchange rates.',
    retry: 'Retry',
    lastUpdate: 'Last updated',
    code: 'Code',
    buyCash: 'Buy Cash',
    buyTransfer: 'Buy Transfer',
    sell: 'Sell',
    rate: 'Rate',
    chartTitle: 'Historical Chart',
    chart7d: '7 days',
    chart30d: '30 days',
    noChart: 'Select a currency pair to view chart.',
    noChartNoData: 'Not enough historical data to render chart.',
    noChartVnd: 'Historical data will accumulate from daily snapshots.',
    exportCsv: 'Export CSV',
    selecting: 'Selecting',
  },
};

type Tab = 'vnd' | 'intl' | 'gold' | 'converter';

function formatRate(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export default function ForexClient({
  initialData,
}: {
  initialData: ForexResponse | null;
}) {
  const [language, setLanguage] = useState<DashboardLanguage>('vi');

  useEffect(() => {
    const stored = localStorage.getItem(DASHBOARD_LANGUAGE_STORAGE_KEY);
    if (stored === 'vi' || stored === 'en') {
      setLanguage(stored);
    }
  }, []);

  const t = copy[language];
  const [data, setData] = useState<ForexResponse | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [activeTab, setActiveTab] = useState<Tab>('vnd');
  const [selectedPair, setSelectedPair] = useState<string | null>(null);
  const [history, setHistory] = useState<ForexHistoryPoint[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyDays, setHistoryDays] = useState(30);
  const [dataFreshness, setDataFreshness] = useState<'fresh' | 'stale'>('fresh');

  const lastUpdated = data
    ? new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(data.vndPairs.updatedAt))
    : '';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/foreign-exchange', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerSnapshot = useCallback(async () => {
    try {
      await fetch('/api/foreign-exchange/snapshot', { method: 'POST' });
    } catch {
      // silent — snapshot is best-effort
    }
  }, []);

  const fetchHistory = useCallback(
    async (pair: string, days: number) => {
      const [from, to] = pair.split('/');
      setHistoryLoading(true);
      try {
        const res = await fetch(
          `/api/foreign-exchange/history?from=${from}&to=${to}&days=${days}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const json = await res.json();
          setHistory(json.data || []);
        }
      } catch {
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (initialData) return;
    fetchData();
  }, [fetchData, initialData]);

  useEffect(() => {
    if (initialData) triggerSnapshot();
  }, [initialData, triggerSnapshot]);

  useEffect(() => {
    if (!data?.vndPairs.updatedAt) return;
    const check = () => {
      const age = Date.now() - new Date(data.vndPairs.updatedAt).getTime();
      setDataFreshness(age < 10 * 60 * 1000 ? 'fresh' : 'stale');
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [data]);

  useEffect(() => {
    if (selectedPair) {
      fetchHistory(selectedPair, historyDays);
    }
  }, [selectedPair, historyDays, fetchHistory]);

  const vndRates = useMemo(() => data?.vndPairs.rates || [], [data]);
  const intlRates = useMemo(() => data?.international.rates || [], [data]);

  const handleSelectPair = (pair: string) => {
    setSelectedPair(pair);
    setHistoryDays(30);
  };

  const handleExportCsv = () => {
    if (chartData.length > 0 && selectedPair) {
      const headers = ['Date', 'Rate'];
      const rows = chartData.map((d) => [d.date, d.rate]);
      downloadCsv(`forex-history-${selectedPair.replace('/', '-')}-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    } else if (activeTab === 'vnd') {
      const headers = [t.code, t.buyCash, t.buyTransfer, t.sell];
      const rows = vndRates.map((r) => [r.code, r.buyCash ?? '-', r.buyTransfer ?? '-', r.sell ?? '-']);
      downloadCsv(`forex-vnd-rates-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    } else if (activeTab === 'intl') {
      const headers = [t.code, t.rate];
      const rows = intlRates.map((r) => [`USD/${r.currency}`, r.rate]);
      downloadCsv(`forex-intl-rates-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
    }
  };

  const chartData = useMemo(() => {
    return history.map((p) => ({
      date: p.date.slice(5),
      rate: p.rate,
    }));
  }, [history]);

  const chartDecimals = useMemo(() => {
    if (!selectedPair) return 2;
    const [, to] = selectedPair.split('/');
    if (to === 'VND' || to === 'JPY' || to === 'KRW') return 0;
    if (to === 'THB' || to === 'HKD') return 2;
    return 4;
  }, [selectedPair]);

  return (
    <main className="mx-auto flex w-[95%] max-w-[1280px] flex-col gap-6 py-6">
      <header className="rounded-[28px] border border-slate-800/80 bg-slate-900/60 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 transition-colors hover:bg-slate-800"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="inline-flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 shadow-lg shadow-emerald-950/60">
                <Globe className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-slate-400">{t.title}</p>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-100 lg:text-3xl">
                  {t.title}
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                  dataFreshness === 'fresh'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-amber-500/10 text-amber-400'
                )}>
                  {dataFreshness === 'fresh' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                  {dataFreshness === 'fresh' ? 'Live' : 'Cũ'}
                </span>
                {t.lastUpdate}: {lastUpdated}
              </span>
            )}
            <button
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              {t.exportCsv}
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t.refresh}
            </button>
          </div>
        </div>

        {loading && !data && (
          <div className="mt-6 flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-400" />
              <p className="text-sm text-slate-400">{t.loading}</p>
            </div>
          </div>
        )}

        {!loading && !data && (
          <div className="mt-6 flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-slate-400">{t.error}</p>
              <button
                onClick={fetchData}
                className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
              >
                {t.retry}
              </button>
            </div>
          </div>
        )}

        {data && (
          <div className="mt-6">
            <div className="flex gap-2 border-b border-slate-800 pb-3 overflow-x-auto" role="tablist">
              <button
                role="tab"
                aria-selected={activeTab === 'vnd'}
                onClick={() => setActiveTab('vnd')}
                className={`rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'vnd'
                    ? 'bg-emerald-600/20 text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Wallet className="mr-1.5 inline-block h-4 w-4" />
                {t.vndTab}
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'intl'}
                onClick={() => setActiveTab('intl')}
                className={`rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'intl'
                    ? 'bg-emerald-600/20 text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="mr-1.5 inline-block h-4 w-4" />
                {t.intlTab}
              </button>
              <button
                onClick={() => setActiveTab('gold')}
                className={`rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'gold'
                    ? 'bg-emerald-600/20 text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingUp className="mr-1.5 inline-block h-4 w-4" />
                {t.goldTab}
              </button>
              <button
                onClick={() => setActiveTab('converter')}
                className={`rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'converter'
                    ? 'bg-emerald-600/20 text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <RefreshCw className="mr-1.5 inline-block h-4 w-4" />
                {t.converterTab}
              </button>
            </div>

            {activeTab === 'converter' && data && (
              <div className="mt-4">
                <ForexConverter data={data} />
              </div>
            )}

            {activeTab === 'gold' && data && (
              <div className="mt-4">
                <GoldPriceCard initialPrices={data.gold.prices} />
              </div>
            )}

            {activeTab === 'vnd' && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3 font-medium">{t.code}</th>
                      <th className="px-4 py-3 text-right font-medium">{t.buyCash}</th>
                      <th className="px-4 py-3 text-right font-medium">{t.buyTransfer}</th>
                      <th className="px-4 py-3 text-right font-medium">{t.sell}</th>
                      <th className="px-4 py-3 text-right font-medium">Spread</th>
                      <th className="px-4 py-3 text-center font-medium">Chart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vndRates.map((rate) => {
                      const spread = rate.sell !== null && rate.buyTransfer !== null && rate.sell > 0
                        ? ((rate.sell - rate.buyTransfer) / rate.sell) * 100 : null;
                      return (
                      <tr
                        key={rate.code}
                        onClick={() => handleSelectPair(`${rate.code}/VND`)}
                        className={`cursor-pointer border-b border-slate-800/50 transition-colors hover:bg-slate-800/30 ${
                          selectedPair === `${rate.code}/VND` ? 'bg-slate-800/40' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-semibold text-white">{rate.code}</span>
                          <span className="ml-2 text-slate-400">/VND</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-200">
                          {rate.buyCash !== null ? formatRate(rate.buyCash, 0) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-200">
                          {rate.buyTransfer !== null ? formatRate(rate.buyTransfer, 0) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-200">
                          {rate.sell !== null ? formatRate(rate.sell, 0) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-xs">
                          {spread !== null ? (
                            <span className={cn(
                              spread < 0.5 ? 'text-emerald-400' : spread < 1 ? 'text-amber-400' : 'text-rose-400'
                            )}>
                              {spread.toFixed(2)}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPair(`${rate.code}/VND`);
                            }}
                            className="rounded-lg border border-slate-700 px-3 py-1 min-h-[44px] text-xs text-slate-400 transition-colors hover:border-emerald-700 hover:text-emerald-400"
                          >
                            <TrendingUp className="inline-block h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                {vndRates.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-400">{t.error}</p>
                )}
              </div>
            )}

            {activeTab === 'intl' && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3 font-medium">{t.code}</th>
                      <th className="px-4 py-3 text-right font-medium">{t.rate}</th>
                      <th className="px-4 py-3 text-center font-medium">Chart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intlRates.map((r) => (
                      <tr
                        key={r.currency}
                        onClick={() => handleSelectPair(`USD/${r.currency}`)}
                        className={`cursor-pointer border-b border-slate-800/50 transition-colors hover:bg-slate-800/30 ${
                          selectedPair === `USD/${r.currency}` ? 'bg-slate-800/40' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-semibold text-white">USD</span>
                          <span className="ml-2 text-slate-400">/{r.currency}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-200">
                          {formatRate(r.rate, 4)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectPair(`USD/${r.currency}`);
                            }}
                            className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-400 transition-colors hover:border-emerald-700 hover:text-emerald-400"
                          >
                            <TrendingUp className="inline-block h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {intlRates.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-400">{t.error}</p>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {selectedPair && activeTab !== 'gold' && activeTab !== 'converter' && (
        <section className="rounded-[28px] border border-slate-800/80 bg-slate-900/60 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <BarChart3 className="h-5 w-5 text-emerald-400" />
              {t.chartTitle}: {selectedPair}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setHistoryDays(7)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  historyDays === 7
                    ? 'bg-emerald-600/20 text-emerald-300'
                    : 'border border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.chart7d}
              </button>
              <button
                onClick={() => setHistoryDays(30)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
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
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="h-6 w-6 animate-spin text-emerald-400" />
            </div>
          ) : chartData.length > 1 ? (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    tickFormatter={(v: number) => formatRate(v, chartDecimals)}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatRate(value, chartDecimals), selectedPair]}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)',
                      backgroundColor: 'rgba(15, 23, 42, 0.92)',
                      color: '#e2e8f0',
                    }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#10b981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            (() => {
              const toCurrency = selectedPair ? selectedPair.split('/')[1] : null;
              const msg = toCurrency === 'VND' ? t.noChartVnd : t.noChartNoData || t.noChart;
              return (
                <p className="py-16 text-center text-sm text-slate-400">{msg}</p>
              );
            })()
          )}
        </section>
      )}
    </main>
  );
}
