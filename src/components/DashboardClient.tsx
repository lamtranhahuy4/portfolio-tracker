'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { DollarSign, PieChart as PieChartIcon, TrendingUp, Activity } from 'lucide-react';
import CsvUploader from '@/components/CsvUploader';
import GroupedTransactionHistoryTable from '@/components/GroupedTransactionHistoryTable';
import ImportWarningsPanel from '@/components/ImportWarningsPanel';
import LogoutButton from '@/components/LogoutButton';
import MarkToMarketGrid, { cn } from '@/components/MarkToMarketGrid';
import MarketOverview from '@/components/MarketOverview';
import NetWorthChart from '@/components/NetWorthChart';
import { usePortfolioMetrics, usePortfolioStore } from '@/store/usePortfolioStore';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

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
  const metrics = usePortfolioMetrics();
  const updatePrice = usePortfolioStore((state) => state.updatePrice);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="p-8 min-h-screen bg-gray-50 dark:bg-gray-950 animate-pulse flex items-center justify-center text-gray-400">Đang tải dữ liệu danh mục từ server...</div>;
  }

  const holdings = metrics.holdings;
  const netPnL = metrics.totalUnrealizedPnL + metrics.averageCostRealizedPnL;
  const chartData = holdings
    .filter((holding) => holding.marketValue > 0 && holding.ticker !== 'CASH_VND')
    .sort((a, b) => b.marketValue - a.marketValue)
    .map((holding) => ({ name: holding.ticker, value: holding.marketValue }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-[1600px] w-[95%] mx-auto py-6 space-y-8">
        <header className="h-64 w-full rounded-2xl overflow-hidden relative mb-4 shadow-lg group">
          <img src="/hero-banner.jpg" alt="Portfolio Oasis" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent flex flex-col justify-end p-8">
            <div className="flex items-start justify-between gap-4">
              <div />
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline text-sm text-white/80">{userEmail}</span>
                {metrics.cashBalanceSource === 'ledger' ? (
                  <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 px-3 py-1 py-1.5 text-xs rounded-xl font-medium tracking-wide">Cash: Ledger Mode</span>
                ) : (
                  <span className="bg-orange-500/20 text-orange-200 border border-orange-500/30 px-3 py-1.5 text-xs rounded-xl font-medium tracking-wide">Cash: Derived Mode</span>
                )}
                <Link href="/account" className="text-white hover:text-indigo-200 text-sm font-medium transition-colors bg-white/10 hover:bg-white/20 px-4 py-1.5 rounded-xl backdrop-blur-sm border border-white/10">
                  Tài khoản
                </Link>
                <LogoutButton />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">My Portfolio Oasis</h1>
            <p className="text-gray-200 mt-2 text-lg font-medium opacity-90 drop-shadow">
              Quản lý tài sản an toàn, thanh thoát và theo dõi thời gian thực.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-2">
          <StatCard title="Tổng tài sản" value={formatCurrency(metrics.totalMarketValue)} icon={<DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />} />
          <StatCard title="Giá vốn hiện tại" value={formatCurrency(metrics.currentCostBasis)} icon={<PieChartIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />} />
          <StatCard
            title="Lãi / lỗ ròng (Avg Cost)"
            value={(netPnL > 0 ? '+' : '') + formatCurrency(netPnL)}
            valueColor={netPnL > 0 ? 'text-emerald-600 dark:text-emerald-400' : netPnL < 0 ? 'text-rose-600 dark:text-rose-500' : ''}
            icon={<Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          />
          <StatCard
            title="Return vs Net Contributions"
            value={(metrics.returnVsCostBasis > 0 ? '+' : '') + formatPercent(metrics.returnVsCostBasis)}
            valueColor={metrics.returnVsCostBasis > 0 ? 'text-emerald-600 dark:text-emerald-400' : metrics.returnVsCostBasis < 0 ? 'text-rose-600 dark:text-rose-500' : ''}
            icon={<TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          />
        </div>

        <NetWorthChart series={metrics.navSeries} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm flex flex-col min-h-[420px]">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">Cơ cấu trọng số tài sản</h2>
            <div className="flex-1 w-full relative">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={85} outerRadius={130} paddingAngle={4} dataKey="value" stroke="none" cornerRadius={4}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        color: '#1f2937',
                        fontWeight: 600,
                      }}
                    />
                    <Legend verticalAlign="bottom" height={40} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
                  <PieChartIcon className="w-10 h-10 opacity-20" />
                  <span>Chưa có dữ liệu để vẽ biểu đồ</span>
                </div>
              )}
            </div>
          </div>
          <div className="xl:col-span-2 flex flex-col h-full">
            <MarketOverview />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-10 gap-6">
          <div className="xl:col-span-2 flex flex-col flex-1 h-full min-h-[420px] gap-4">
            <div className="flex-1 max-h-[160px]">
              <CsvUploader />
            </div>
            <ImportWarningsPanel />
          </div>
          <div className="xl:col-span-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Phân tích lợi nhuận</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">So sánh giữa weighted average cost và FIFO realized PnL.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
                <MiniMetric label="Realized PnL (Avg Cost)" value={formatCurrency(metrics.averageCostRealizedPnL)} />
                <MiniMetric label="Realized PnL (FIFO)" value={formatCurrency(metrics.fifoRealizedPnL)} />
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Net contributions hiện tại: <span className="font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(metrics.netContributions)}</span>
            </div>
            {metrics.calculationWarnings.length > 0 && (
              <div className="mt-4 rounded-xl bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200 px-4 py-3 text-sm">
                {metrics.calculationWarnings.length} cảnh báo tính toán được phát hiện. Hãy kiểm tra lại các giao dịch bán vượt số lượng hoặc dữ liệu lịch sử thiếu lot.
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Định giá Mark-to-Market</h2>
          <MarkToMarketGrid holdings={holdings} onPriceChange={updatePrice} />
        </div>

        <div className="flex flex-col gap-4 pt-8 border-t border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">🗒️ Lịch sử Giao dịch Gốc</h2>
          <GroupedTransactionHistoryTable />
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, valueColor, icon }: { title: string; value: string | number; valueColor?: string; icon: React.ReactNode; }) {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-5 relative overflow-hidden group">
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500" />
      <div className="flex items-center justify-between relative z-10">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</h3>
        <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl">{icon}</div>
      </div>
      <div className="relative z-10">
        <div className={cn('text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white', valueColor)}>{value}</div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-950/60 px-4 py-3 min-w-[220px]">
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  );
}
