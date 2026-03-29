'use client';

import React from 'react';
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
import { NavPoint } from '@/types/portfolio';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

type NetWorthChartProps = {
  series: NavPoint[];
};

export default function NetWorthChart({ series }: NetWorthChartProps) {
  if (series.length === 0) {
    return (
      <div className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-10 text-center text-sm text-slate-400 shadow-xl shadow-black/20">
        Chua co du du lieu de dung bieu do tai san rong.
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-100">Tang truong tai san rong</h2>
        <p className="text-sm text-slate-400">
          Snapshot cuoi ngay tu giao dich dau tien cua ban den hien tai.
        </p>
      </div>

      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series}>
            <defs>
              <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
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
              formatter={(value: number, name: string) => [formatCurrency(value), name === 'netAssetValue' ? 'Tai san rong' : 'Von rong nap/rut']}
              labelFormatter={(label) => `Ngay ${label}`}
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
            <Area
              type="monotone"
              dataKey="netAssetValue"
              stroke="none"
              fill="url(#navFill)"
            />
            <Line
              type="monotone"
              dataKey="netAssetValue"
              name="Tai san rong"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="netContributions"
              name="Von rong nap/rut"
              stroke="#10b981"
              strokeDasharray="6 6"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
