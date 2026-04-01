'use client';

import { AlertTriangle, CheckCircle2, Radar, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { DashboardLanguage } from '@/lib/dashboardLocale';
import { i18n } from '@/lib/i18n';
import { usePortfolioMetrics } from '@/store/usePortfolioStore';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

function BreakdownRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: 'neutral' | 'positive' | 'negative';
}) {
  const colorClass = emphasis === 'positive'
    ? 'text-emerald-300'
    : emphasis === 'negative'
      ? 'text-rose-300'
      : 'text-slate-100';

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm font-semibold ${colorClass}`}>{formatCurrency(value)}</span>
    </div>
  );
}

export default function ReconciliationPanel({ language }: { language: DashboardLanguage }) {
  const metrics = usePortfolioMetrics();
  const t = i18n[language].reconciliation;
  const breakdown = metrics.reconciliation;

  return (
    <section className="space-y-4 rounded-[28px] border border-slate-800 bg-slate-900/50 p-5 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">{t.title}</h2>
          <p className="mt-1 text-sm text-slate-400">{t.subtitle}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
          <Radar className="h-5 w-5 text-cyan-300" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <BreakdownRow label={t.cashBalance} value={breakdown.cashBalance} />
        <BreakdownRow label={t.stockMarketValue} value={breakdown.stockMarketValue} />
        <BreakdownRow label={t.grossNavBeforeDebt} value={breakdown.grossNavBeforeDebt} />
        <BreakdownRow label={t.feeDebt} value={breakdown.feeDebt} emphasis={breakdown.feeDebt > 0 ? 'negative' : 'neutral'} />
        <BreakdownRow label={t.netNav} value={breakdown.netNav} emphasis="positive" />
        <BreakdownRow label={t.costBasis} value={breakdown.currentCostBasis} />
        <BreakdownRow label={t.unrealizedPnL} value={breakdown.totalUnrealizedPnL} emphasis={breakdown.totalUnrealizedPnL >= 0 ? 'positive' : 'negative'} />
        <BreakdownRow label={t.avgRealizedPnL} value={breakdown.averageCostRealizedPnL} emphasis={breakdown.averageCostRealizedPnL >= 0 ? 'positive' : 'negative'} />
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MiniStat label={t.activeStocks} value={breakdown.positiveStockCount.toString()} />
        <MiniStat label={t.negativeStocks} value={breakdown.negativeStockCount.toString()} warning={breakdown.negativeStockCount > 0} />
        <MiniStat label={t.openingPositions} value={breakdown.openingPositionCount.toString()} />
        <MiniStat
          label={t.liveCoverage}
          value={`${breakdown.livePriceCoverageCount}/${breakdown.positiveStockCount}`}
          warning={breakdown.fallbackPriceCount > 0}
        />
      </div>

      {metrics.cashBalanceSource === 'ledger' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <MiniStat label={t.ledgerCash} value={formatCurrency(breakdown.cashBalance)} icon={<Wallet className="h-4 w-4" />} />
          <MiniStat label={t.derivedCash} value={formatCurrency(breakdown.derivedCashBalance ?? 0)} />
          <MiniStat
            label={t.cashDrift}
            value={formatCurrency(breakdown.cashDrift ?? 0)}
            warning={(breakdown.cashDrift ?? 0) > 100}
          />
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">{t.insights}</h3>
        {breakdown.insights.length === 0 ? (
          <div className="rounded-2xl border border-emerald-900/40 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
            {t.noInsights}
          </div>
        ) : (
          breakdown.insights.map((insight) => (
            <div
              key={insight.code}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                insight.level === 'warning'
                  ? 'border-amber-900/40 bg-amber-950/20 text-amber-100'
                  : 'border-cyan-900/40 bg-cyan-950/20 text-cyan-100'
              }`}
            >
              {insight.level === 'warning' ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
              )}
              <span>{insight.message}</span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function MiniStat({
  label,
  value,
  warning,
  icon,
}: {
  label: string;
  value: string;
  warning?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${warning ? 'border-amber-900/40 bg-amber-950/15' : 'border-slate-800 bg-slate-950/35'}`}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <div className={`mt-2 text-lg font-semibold ${warning ? 'text-amber-200' : 'text-slate-100'}`}>{value}</div>
    </div>
  );
}
