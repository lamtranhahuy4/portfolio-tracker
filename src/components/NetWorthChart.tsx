'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DashboardLanguage } from '@/lib/dashboardLocale';
import { NavPoint } from '@/types/portfolio';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

type NetWorthChartProps = {
  series: NavPoint[];
  language: DashboardLanguage;
};

const copy = {
  vi: {
    empty: 'Chưa có đủ dữ liệu để dựng biểu đồ.',
    title: 'Tăng trưởng tài sản & Benchmark',
    subtitle: 'So sánh hiệu suất danh mục với VN-INDEX',
    nav: 'Tài sản ròng',
    contributions: 'Vốn ròng',
    vnindex: 'VN-INDEX',
    day: 'Ngày',
    portfolioReturn: 'Lợi nhuận Portfolio',
    benchmarkReturn: 'Lợi nhuận VN-INDEX',
    alpha: 'Alpha (Chênh lệch)',
    loading: 'Đang tải benchmark...',
    vs: 'vs',
  },
  en: {
    empty: 'Not enough data to render chart.',
    title: 'Net Worth & Benchmark',
    subtitle: 'Compare portfolio performance with VN-INDEX',
    nav: 'Net Asset Value',
    contributions: 'Net Contributions',
    vnindex: 'VN-INDEX',
    day: 'Date',
    portfolioReturn: 'Portfolio Return',
    benchmarkReturn: 'VN-INDEX Return',
    alpha: 'Alpha (Difference)',
    loading: 'Loading benchmark...',
    vs: 'vs',
  },
};

interface BenchmarkData {
  date: string;
  portfolioValue: number;
  vnindexValue: number;
  portfolioReturn: number;
  vnindexReturn: number;
  alpha: number;
}

export default function NetWorthChart({ series, language }: NetWorthChartProps) {
  const t = copy[language];
  const [vnindexHistory, setVnindexHistory] = useState<Record<string, number> | null>(null);
  const [loadingVnindex, setLoadingVnindex] = useState(true);

  useEffect(() => {
    const fetchVnindex = async () => {
      try {
        const response = await fetch('/api/vnindex-history');
        if (response.ok) {
          const data = await response.json();
          setVnindexHistory(data.prices?.VNINDEX || null);
        }
      } catch {
        setVnindexHistory(null);
      } finally {
        setLoadingVnindex(false);
      }
    };

    if (series.length > 0) {
      fetchVnindex();
    } else {
      setLoadingVnindex(false);
    }
  }, [series]);

  const chartData = useMemo<BenchmarkData[]>(() => {
    if (series.length === 0) return [];
    if (!vnindexHistory || Object.keys(vnindexHistory).length === 0) {
      return series.map((point) => ({
        date: point.date,
        portfolioValue: point.netAssetValue,
        vnindexValue: 0,
        portfolioReturn: 0,
        vnindexReturn: 0,
        alpha: 0,
      }));
    }

    const vnindexDates = Object.keys(vnindexHistory).sort();
    if (vnindexDates.length === 0) {
      return series.map((point) => ({
        date: point.date,
        portfolioValue: point.netAssetValue,
        vnindexValue: 0,
        portfolioReturn: 0,
        vnindexReturn: 0,
        alpha: 0,
      }));
    }

    const vnindexStart = vnindexHistory[vnindexDates[0]];
    const portfolioStart = series[0].netAssetValue;

    return series.map((point) => {
      const vnindexOnDate = vnindexHistory[point.date] || vnindexHistory[vnindexDates.find(d => d <= point.date) || vnindexDates[0]];
      
      const portfolioReturn = portfolioStart > 0 
        ? ((point.netAssetValue - portfolioStart) / portfolioStart) * 100 
        : 0;
      
      const vnindexReturn = vnindexStart > 0 && vnindexOnDate
        ? ((vnindexOnDate - vnindexStart) / vnindexStart) * 100
        : 0;

      return {
        date: point.date,
        portfolioValue: point.netAssetValue,
        vnindexValue: vnindexOnDate || 0,
        portfolioReturn,
        vnindexReturn,
        alpha: portfolioReturn - vnindexReturn,
      };
    });
  }, [series, vnindexHistory]);

  const latestData = chartData[chartData.length - 1];
  const portfolioTotalReturn = latestData?.portfolioReturn || 0;
  const vnindexTotalReturn = latestData?.vnindexReturn || 0;
  const alpha = portfolioTotalReturn - vnindexTotalReturn;

  if (series.length === 0) {
    return (
      <div className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-10 text-center text-sm text-slate-400 shadow-xl shadow-black/20">
        {t.empty}
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-100">{t.title}</h2>
        <p className="text-sm text-slate-400">{t.subtitle}</p>
      </div>

      {latestData && (
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="rounded-xl bg-slate-800/50 p-3 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wider">{t.portfolioReturn}</p>
            <p className={`text-xl font-bold ${portfolioTotalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {portfolioTotalReturn >= 0 ? '+' : ''}{portfolioTotalReturn.toFixed(2)}%
            </p>
          </div>
          <div className="rounded-xl bg-slate-800/50 p-3 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wider">{t.benchmarkReturn}</p>
            <p className={`text-xl font-bold ${vnindexTotalReturn >= 0 ? 'text-blue-400' : 'text-rose-400'}`}>
              {vnindexTotalReturn >= 0 ? '+' : ''}{vnindexTotalReturn.toFixed(2)}%
            </p>
          </div>
          <div className="rounded-xl bg-slate-800/50 p-3 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wider">{t.alpha}</p>
            <p className={`text-xl font-bold flex items-center justify-center gap-1 ${alpha >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {alpha >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {alpha >= 0 ? '+' : ''}{alpha.toFixed(2)}%
            </p>
          </div>
        </div>
      )}

      {loadingVnindex && (
        <div className="flex items-center justify-center h-[280px] text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span className="text-sm">{t.loading}</span>
        </div>
      )}

      {!loadingVnindex && (
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="vnindexFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                minTickGap={24}
              />
              <YAxis
                tickFormatter={(value) => `${Math.round(value / 1000000)}M`}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === t.nav) {
                    return [new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value), name];
                  }
                  return [`${value.toFixed(2)}%`, name];
                }}
                labelFormatter={(label) => `${t.day} ${label}`}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)',
                  backgroundColor: 'rgba(15, 23, 42, 0.92)',
                  color: '#e2e8f0',
                }}
                labelStyle={{ color: '#cbd5e1' }}
              />
              <Legend wrapperStyle={{ color: '#94a3b8' }} />
              <Area type="monotone" dataKey="portfolioValue" stroke="none" fill="url(#portfolioFill)" />
              <Line type="monotone" dataKey="portfolioValue" name={t.nav} stroke="#3b82f6" strokeWidth={3} dot={false} />
              <Area type="monotone" dataKey="vnindexValue" stroke="none" fill="url(#vnindexFill)" />
              <Line type="monotone" dataKey="vnindexValue" name={t.vnindex} stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
