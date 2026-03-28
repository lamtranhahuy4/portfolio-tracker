'use client';

import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-10 text-center text-sm text-gray-500 dark:text-gray-400">
        Chưa có đủ dữ liệu để dựng biểu đồ tài sản ròng.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Tăng trưởng tài sản ròng</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Snapshot cuối ngày từ giao dịch đầu tiên của bạn đến hiện tại.
        </p>
      </div>

      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(value) => `${Math.round(value / 1000000)}M`}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number, name: string) => [formatCurrency(value), name === 'netAssetValue' ? 'Tài sản ròng' : 'Vốn ròng nạp/rút']}
              labelFormatter={(label) => `Ngày ${label}`}
              contentStyle={{
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="netAssetValue"
              name="Tài sản ròng"
              stroke="#2563eb"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="netContributions"
              name="Vốn ròng nạp/rút"
              stroke="#10b981"
              strokeDasharray="6 6"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
