'use client';

import React, { useEffect, useState } from 'react';
import { usePortfolioStore, useHoldings } from '@/store/usePortfolioStore';
import MarkToMarketGrid, { cn } from '@/components/MarkToMarketGrid';
import CsvUploader from '@/components/CsvUploader';
import TransactionHistoryTable from '@/components/TransactionHistoryTable';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { DollarSign, PieChart as PieChartIcon, TrendingUp, Activity } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'percent',
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero'
  }).format(value);
};

export default function DashboardClient() {
  const [isMounted, setIsMounted] = useState(false);
  
  const holdings = useHoldings();
  const updatePrice = usePortfolioStore((state) => state.updatePrice);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="p-8 min-h-screen bg-gray-50 dark:bg-gray-950 animate-pulse flex items-center justify-center text-gray-400">Đang tải dữ liệu danh mục từ Server...</div>;
  }

  let totalInvested = 0;
  let totalMarketValue = 0;

  holdings.forEach(h => {
    const costBasis = h.ticker === 'CASH_VND' ? h.totalShares : h.totalShares * h.averageCost;
    totalInvested += costBasis;
    totalMarketValue += h.marketValue;
  });

  const netPnL = totalMarketValue - totalInvested;
  const roiPercent = totalInvested > 0 ? netPnL / totalInvested : 0;

  const chartData = holdings
    .filter(h => h.marketValue > 0)
    .sort((a, b) => b.marketValue - a.marketValue)
    .map(h => ({
      name: h.ticker,
      value: h.marketValue
    }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* --- HERO BANNER --- */}
        <header className="h-64 w-full rounded-2xl overflow-hidden relative mb-8 shadow-lg group">
          <img src="/hero-banner.jpg" alt="Portfolio Oasis" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent flex flex-col justify-end p-8">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-md">
              My Portfolio Oasis
            </h1>
            <p className="text-gray-200 mt-2 text-lg font-medium opacity-90 drop-shadow">
              Quản lý tài sản an toàn, thanh thoát và tự động hóa cao.
            </p>
          </div>
        </header>

        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            📊 Tổng quan Danh mục
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Hệ thống Quản lý và Tự động định giá Mark-to-Market.
          </p>
        </div>

        {/* --- KHU VỰC UPLOAD DỮ LIỆU --- */}
        <CsvUploader />

        {/* --- KHU VỰC LỊCH SỬ GIAO DỊCH --- */}
        <div className="flex flex-col gap-4 mb-4">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            🗒️ Lịch sử Giao dịch
          </h2>
          <TransactionHistoryTable />
        </div>

        {/* --- HÀNG 1: 4 THẺ THỐNG KÊ (AGGREGATE STATS) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <StatCard 
            title="Tổng Tài Sản" 
            value={formatCurrency(totalMarketValue)} 
            icon={<DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          />
          <StatCard 
            title="Tổng Vốn Đầu Tư" 
            value={formatCurrency(totalInvested)} 
            icon={<PieChartIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
          />
          <StatCard 
            title="Lãi / Lỗ Ròng" 
            value={(netPnL > 0 ? '+' : '') + formatCurrency(netPnL)} 
            valueColor={netPnL > 0 ? 'text-emerald-600 dark:text-emerald-400' : netPnL < 0 ? 'text-rose-600 dark:text-rose-500' : ''}
            icon={<Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
          />
          <StatCard 
            title="Tỷ Suất Sinh Lời (ROI)" 
            value={(netPnL > 0 ? '+' : '') + formatPercent(roiPercent)} 
            valueColor={netPnL > 0 ? 'text-emerald-600 dark:text-emerald-400' : netPnL < 0 ? 'text-rose-600 dark:text-rose-500' : ''}
            icon={<TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          />
        </div>

        {/* --- HÀNG 2 & 3: BIỂU ĐỒ VÀ BẢNG DATA --- */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          <div className="xl:col-span-1 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-6">Cơ cấu Trọng số Tài sản</h2>
            
            <div className="flex-1 min-h-[320px] w-full relative">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={75}
                      outerRadius={110}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                      cornerRadius={4}
                    >
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
                        fontWeight: 600
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

          <div className="xl:col-span-2 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Định giá Mark-to-Market</h2>
            <MarkToMarketGrid holdings={holdings} onPriceChange={updatePrice} />
          </div>

        </div>
      </main>
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  valueColor, 
  icon 
}: { 
  title: string; 
  value: string | number; 
  valueColor?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-5 relative overflow-hidden group">
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
      
      <div className="flex items-center justify-between relative z-10">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</h3>
        <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl">
          {icon}
        </div>
      </div>
      <div className="relative z-10">
        <div className={cn("text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white", valueColor)}>
          {value}
        </div>
      </div>
    </div>
  );
}
