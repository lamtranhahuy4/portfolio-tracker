'use client';

import React from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { DashboardLanguage } from '@/lib/dashboardLocale';
import { usePortfolioMetrics } from '@/store/usePortfolioStore';

const RADIAN = Math.PI / 180;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

const copy = {
  vi: {
    title: 'Phân bổ tài sản',
    subtitle: 'Tỷ lệ các loại tài sản trong danh mục',
    noData: 'Chưa có dữ liệu phân bổ',
    stocks: 'Cổ phiếu',
    cash: 'Tiền mặt',
    total: 'Tổng tài sản',
  },
  en: {
    title: 'Asset Allocation',
    subtitle: 'Distribution of asset types in your portfolio',
    noData: 'No allocation data available',
    stocks: 'Stocks',
    cash: 'Cash',
    total: 'Total Assets',
  },
};

const ASSET_COLORS: Record<string, string> = {
  stocks: '#3B82F6',
  cash: '#22C55E',
  savings: '#F59E0B',
  insurance: '#8B5CF6',
  debt: '#EF4444',
  other: '#64748B',
};

interface AllocationItem {
  id: string;
  label: string;
  value: number;
  percent: number;
  color: string;
}

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}) {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function AssetAllocationChart({ language }: { language: DashboardLanguage }) {
  const t = copy[language];
  const metrics = usePortfolioMetrics();
  const holdings = metrics.holdings;

  const totalMarketValue = Number(metrics.totalMarketValue) || 0;
  const cashBalance = Number(metrics.cashBalanceEOD) 
    || holdings.find(h => h.ticker === 'CASH_VND')?.marketValue 
    || 0;
  const stocksValue = totalMarketValue - cashBalance;
  const totalValue = totalMarketValue;

  const allocationData: AllocationItem[] = [];

  if (stocksValue > 0) {
    allocationData.push({
      id: 'stocks',
      label: t.stocks,
      value: stocksValue,
      percent: totalValue > 0 ? stocksValue / totalValue : 0,
      color: ASSET_COLORS.stocks,
    });
  }

  if (cashBalance > 0) {
    allocationData.push({
      id: 'cash',
      label: t.cash,
      value: cashBalance,
      percent: totalValue > 0 ? cashBalance / totalValue : 0,
      color: ASSET_COLORS.cash,
    });
  }

  if (allocationData.length === 0) {
    return (
      <div className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
        <div className="mb-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">{t.title}</h3>
          <p className="text-xs text-slate-500">{t.subtitle}</p>
        </div>
        <div className="flex h-[200px] items-center justify-center text-sm text-slate-500">
          {t.noData}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">{t.title}</h3>
        <p className="text-xs text-slate-500">{t.subtitle}</p>
      </div>

      <div className="flex items-center gap-6">
        <div className="h-[180px] w-[180px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={allocationData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {allocationData.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string, props: { payload: AllocationItem }) => [
                  formatCurrency(value),
                  props.payload.label,
                ]}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)',
                  backgroundColor: 'rgba(15, 23, 42, 0.92)',
                  color: '#e2e8f0',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-3">
          {allocationData.map((item) => (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-slate-300">{item.label}</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-slate-200">
                  {formatCurrency(item.value)}
                </div>
                <div className="text-xs text-slate-500">
                  {(item.percent * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
          <div className="border-t border-slate-700 pt-3 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-400">{t.total}</span>
              <span className="text-sm font-semibold text-slate-200">
                {formatCurrency(totalValue)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <div className="text-xs text-slate-500">{t.stocks}</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-semibold text-blue-400">
              {stocksValue > 0 ? formatCurrency(stocksValue) : '0'}
            </span>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <div className="text-xs text-slate-500">{t.cash}</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-lg font-semibold text-green-400">
              {formatCurrency(cashBalance)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
