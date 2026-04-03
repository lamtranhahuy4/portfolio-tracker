'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Wallet, PieChart as PieChartIcon, TrendingUp, CheckCircle2, ShieldCheck, CalendarDays, Languages } from 'lucide-react';
import CsvUploaderServerImport from '@/components/CsvUploaderServerImport';
import FeeDebtCard from '@/components/FeeDebtCard';
import GroupedTransactionHistoryTable from '@/components/GroupedTransactionHistoryTable';
import HeroBanner from '@/components/HeroBanner';
import ImportWarningsPanel from '@/components/ImportWarningsPanel';
import OpeningPositionCard from '@/components/OpeningPositionCard';
import ReconciliationPanel from '@/components/ReconciliationPanel';
import LogoutButton from '@/components/LogoutButton';
import MarkToMarketGrid, { cn } from '@/components/MarkToMarketGrid';
import NetWorthChart from '@/components/NetWorthChart';
import OnboardingWizard from '@/components/OnboardingWizard';
import EmptyStateHero from '@/components/EmptyStateHero';
import TooltipInfo from '@/components/TooltipInfo';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DASHBOARD_LANGUAGE_STORAGE_KEY, DashboardLanguage } from '@/lib/dashboardLocale';
import { i18n } from '@/lib/i18n';
import { usePortfolioMetrics, usePortfolioStore } from '@/store/usePortfolioStore';
import { QUOTE_REFRESH_INTERVAL_MS } from '@/lib/constants';

const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
}).format(value);

const formatPercent = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'percent',
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
}).format(value);

export default function DashboardClient({ userEmail }: { userEmail: string }) {
  const [isMounted, setIsMounted] = useState(false);
  const [language, setLanguage] = useState<DashboardLanguage>('vi');
  const metrics = usePortfolioMetrics();
  const transactions = usePortfolioStore((state) => state.transactions);
  const globalCutoffDate = usePortfolioStore((state) => state.globalCutoffDate);
  const updatePrice = usePortfolioStore((state) => state.updatePrice);
  const valuationDate = usePortfolioStore((state) => state.valuationDate);
  const setValuationDate = usePortfolioStore((state) => state.setValuationDate);
  const cashEvents = usePortfolioStore((state) => state.cashEvents);
  const openingPositions = usePortfolioStore((state) => state.openingPositions);
  const initialNetContributions = usePortfolioStore((state) => state.initialNetContributions);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(DASHBOARD_LANGUAGE_STORAGE_KEY);
    if (storedLanguage === 'vi' || storedLanguage === 'en') {
      setLanguage(storedLanguage);
    }
    setIsMounted(true);
  }, []);

  const t = i18n[language].dashboard;
  const liveTickerSymbols = useMemo(() => Array.from(new Set(
    metrics.holdings
      .filter((holding) => holding.assetClass === 'STOCK' && holding.totalShares > 0)
      .map((holding) => holding.ticker)
  )).sort(), [metrics.holdings]);
  const liveTickerQuery = liveTickerSymbols.join(',');

  useEffect(() => {
    if (isMounted) {
      window.localStorage.setItem(DASHBOARD_LANGUAGE_STORAGE_KEY, language);
    }
  }, [isMounted, language]);

  useEffect(() => {
    if (!isMounted || !liveTickerQuery) return;

    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch(`/api/quotes?symbols=${encodeURIComponent(liveTickerQuery)}`, { cache: 'no-store' });
        if (!response.ok) return;
        const quotes = await response.json() as Record<string, number>;
        if (!active) return;
        Object.entries(quotes).forEach(([ticker, price]) => updatePrice(ticker, price));
      } catch (error) {
        console.error('Failed to fetch quotes:', error);
        toast.error('Không thể cập nhật giá. Vui lòng thử lại.');
      }
    };

    refresh();
    const interval = window.setInterval(refresh, QUOTE_REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isMounted, liveTickerQuery, updatePrice]);

  if (!isMounted) {
    return null;
  }

  if (transactions.length === 0 && !globalCutoffDate) {
    return <OnboardingWizard language={language} />;
  }

  const holdings = metrics.holdings;
  const unrealizedPnL = metrics.totalUnrealizedPnL;
  const avgPnL = metrics.totalUnrealizedPnL + metrics.averageCostRealizedPnL;
  const fifoPnL = metrics.totalUnrealizedPnL + metrics.fifoRealizedPnL;
  const isLedgerMode = metrics.cashBalanceSource === 'ledger';

  const isDemoMode = transactions.some(t => String(t.id).startsWith('mock-'));
  

  
  const hasData = transactions.length > 0 || cashEvents.length > 0 || openingPositions.length > 0 || initialNetContributions > 0;
  
  const clearDemo = () => {
    usePortfolioStore.getState().setTransactions([]);
    usePortfolioStore.getState().setCashEvents([]);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {isDemoMode && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-4 py-2.5 flex items-center justify-center gap-3 animate-in slide-in-from-top-full z-50">
          <AlertCircle className="w-5 h-5 text-rose-400" />
          <p className="text-rose-300 text-sm font-medium">Bạn đang trong chế độ Demo. Lưu ý dữ liệu không được sao lưu.</p>
          <button onClick={clearDemo} className="ml-4 px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold rounded-lg transition-colors">
            Xóa Demo & Bắt đầu thật
          </button>
        </div>
      )}

      <main className="mx-auto flex w-[95%] max-w-[1680px] flex-col gap-6 py-6">
        <header className="rounded-[28px] border border-slate-800/80 bg-slate-900/60 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-950/60">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.32em] text-slate-500">{t.product}</p>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-100 lg:text-3xl">{t.dashboard}</h1>
                  </div>
                </div>
                <p className="max-w-3xl text-sm leading-6 text-slate-400">{t.subtitle}</p>
              </div>

              <div className="flex flex-col items-stretch gap-3 lg:items-end">
                <div className="flex flex-wrap items-center gap-3">
                  <div className={cn(
                    'inline-flex items-center gap-3 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]',
                    isLedgerMode
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  )}>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className={cn(
                        'absolute inline-flex h-full w-full rounded-full opacity-75',
                        isLedgerMode ? 'animate-ping bg-emerald-400' : 'bg-amber-400/60'
                      )} />
                      <span className={cn(
                        'relative inline-flex h-2.5 w-2.5 rounded-full',
                        isLedgerMode ? 'bg-emerald-400' : 'bg-amber-400'
                      )} />
                    </span>
                    {isLedgerMode ? t.ledgerMode : t.derivedMode}
                  </div>

                  <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-slate-300">
                    <CalendarDays className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-400">{t.snapshot}</span>
                    <input
                      type="date"
                      className="bg-transparent text-slate-100 outline-none [color-scheme:dark]"
                      value={valuationDate ? valuationDate.toISOString().split('T')[0] : ''}
                      onChange={(e) => setValuationDate(e.target.value ? new Date(e.target.value) : null)}
                    />
                    {valuationDate && (
                      <button
                        onClick={() => setValuationDate(null)}
                        className="text-slate-500 transition-colors hover:text-slate-200"
                        title={t.clearSnapshot}
                      >
                        ×
                      </button>
                    )}
                  </div>

                  <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-950/80 p-1 text-sm text-slate-300">
                    <div className="flex items-center gap-2 px-3 text-slate-400">
                      <Languages className="h-4 w-4" />
                      <span>{t.language}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLanguage('vi')}
                      className={cn('rounded-xl px-3 py-1.5 font-medium transition-colors', language === 'vi' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900')}
                    >
                      {t.vietnamese}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={cn('rounded-xl px-3 py-1.5 font-medium transition-colors', language === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900')}
                    >
                      {t.english}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3">
                  <div className="min-w-[180px] px-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{t.operator}</p>
                    <p className="truncate text-sm font-medium text-slate-200">{userEmail}</p>
                  </div>
                  <Link
                    href="/account"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
                  >
                    <ShieldCheck className="h-4 w-4 text-blue-400" />
                    {t.account}
                  </Link>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-1">
                    <LogoutButton language={language} />
                  </div>
                </div>
              </div>
            </div>


          </div>
        </header>

        <HeroBanner userEmail={userEmail} language={language} />

        {!hasData ? (
          <EmptyStateHero language={language} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard 
            title={t.totalNav} 
            tooltip={t.glossary?.totalNav}
            value={formatCurrency(metrics.totalMarketValue)} 
            icon={<Wallet className="h-5 w-5 text-blue-300" />} 
            subValue={
              <span className="flex items-center gap-1.5 font-medium">
                <span className="text-slate-400">{t.roi}:</span>
                <span className={metrics.returnOnInvestmentPercent > 0 ? 'text-emerald-400' : metrics.returnOnInvestmentPercent < 0 ? 'text-rose-400' : 'text-slate-300'}>
                  {metrics.returnOnInvestmentPercent > 0 ? '+' : ''}{formatPercent(metrics.returnOnInvestmentPercent)}
                </span>
              </span>
            }
          />
          <StatCard title={t.costBasis} value={formatCurrency(metrics.currentCostBasis)} icon={<PieChartIcon className="h-5 w-5 text-indigo-300" />} />
          <StatCard
            title={t.unrealizedPnL}
            tooltip={t.glossary?.unrealizedPnL}
            value={`${unrealizedPnL > 0 ? '+' : ''}${formatCurrency(unrealizedPnL)}`}
            valueColor={unrealizedPnL > 0 ? 'text-emerald-400' : unrealizedPnL < 0 ? 'text-rose-400' : 'text-slate-100'}
            icon={<TrendingUp className="h-5 w-5 text-amber-300" />}
          />
          <StatCard
            title={t.avgPnL}
            tooltip={t.glossary?.avgPnL}
            value={`${avgPnL > 0 ? '+' : ''}${formatCurrency(avgPnL)}`}
            valueColor={avgPnL > 0 ? 'text-emerald-400' : avgPnL < 0 ? 'text-rose-400' : 'text-slate-100'}
            icon={<TrendingUp className="h-5 w-5 text-emerald-300" />}
          />
          <StatCard
            title={t.fifoPnL}
            tooltip={t.glossary?.fifoPnL}
            value={`${fifoPnL > 0 ? '+' : ''}${formatCurrency(fifoPnL)}`}
            valueColor={fifoPnL > 0 ? 'text-emerald-400' : fifoPnL < 0 ? 'text-rose-400' : 'text-slate-100'}
            icon={<CheckCircle2 className="h-5 w-5 text-cyan-300" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <NetWorthChart series={metrics.navSeries} language={language} />
            <ReconciliationPanel language={language} />
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">{t.markToMarket}</h2>
                  <p className="text-sm text-slate-400">{t.markToMarketDesc}</p>
                </div>
                <div className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs uppercase tracking-[0.22em] text-slate-400">
                  {holdings.length} {t.positions}
                </div>
              </div>
              <MarkToMarketGrid holdings={holdings} onPriceChange={updatePrice} language={language} />
            </section>
            <section className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100">{t.groupedHistory}</h2>
                  <p className="text-sm text-slate-400">{t.groupedHistoryDesc}</p>
                </div>
                <div className="rounded-full border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs uppercase tracking-[0.22em] text-slate-400">
                  {t.returnLabel} {formatPercent(metrics.returnVsCostBasis)}
                </div>
              </div>
              <GroupedTransactionHistoryTable language={language} />
            </section>
          </div>


          <aside className="flex flex-col gap-6 lg:col-span-1">
            <div className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-3 backdrop-blur-sm">
              <CsvUploaderServerImport language={language} />
            </div>
            <FeeDebtCard />
            <OpeningPositionCard />
            <ImportWarningsPanel language={language} />
            {metrics.calculationWarnings.length > 0 && (
              <div className="rounded-[28px] border border-amber-900/50 bg-amber-950/20 p-5 text-sm text-amber-200 backdrop-blur-sm">
                {metrics.calculationWarnings.length} {t.calcWarnings}
              </div>
            )}
          </aside>
        </div>
        </>
        )}
      </main>
    </div>
  );
}

function StatCard({ title, value, valueColor, icon, subValue, tooltip }: { title: string; value: string | number; valueColor?: string; icon: React.ReactNode; subValue?: React.ReactNode; tooltip?: string; }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-black/20 backdrop-blur-sm flex flex-col justify-between">
      <div>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 flex items-center">
            {title}
            {tooltip && <TooltipInfo content={tooltip} />}
          </h3>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">{icon}</div>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-1">
        <div className={cn('text-3xl font-semibold tracking-tight text-slate-100', valueColor)}>{value}</div>
        {subValue && <div className="text-sm mt-1">{subValue}</div>}
      </div>
    </div>
  );
}
