'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Clock, Activity, Globe } from 'lucide-react';

const MARKET_INDICES = [
  { name: 'VN-INDEX', price: '1,250.45', change: '+12.50', percent: '+1.01%', up: true },
  { name: 'S&P 500', price: '5,123.69', change: '+45.89', percent: '+0.90%', up: true },
  { name: 'BTC/USD', price: '68,450.00', change: '-1,230.00', percent: '-1.76%', up: false },
  { name: 'GOLD (Ounce)', price: '2,350.20', change: '+15.40', percent: '+0.66%', up: true },
];

const TRENDING_ASSETS = [
  { ticker: 'FPT', name: 'Công ty Cổ phần FPT', price: '115,000 ₫', change: '+2.5%' },
  { ticker: 'VCB', name: 'Ngân hàng Vietcombank', price: '95,400 ₫', change: '+1.2%' },
  { ticker: 'NVDA', name: 'Nvidia Corp', price: '$850.50', change: '+3.8%' },
];

export default function MarketOverview() {
  return (
    <div className="h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 flex flex-col transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Thị trường Tài chính (Live)</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1.5 rounded-full ring-1 ring-emerald-200 dark:ring-emerald-800/50">
          <Clock className="w-3.5 h-3.5 animate-pulse" />
          <span>Đang đồng bộ</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {MARKET_INDICES.map((idx, i) => (
          <div key={i} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex flex-col gap-1 transition-all hover:-translate-y-1 hover:shadow-sm cursor-default">
            <span className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">{idx.name}</span>
            <span className="text-lg font-extrabold text-gray-900 dark:text-white mt-1">{idx.price}</span>
            <div className={`flex items-center gap-1 text-[11px] font-bold mt-0.5 ${idx.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {idx.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{idx.change} ({idx.percent})</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 bg-gray-50/30 dark:bg-gray-800/10 rounded-xl p-4 border border-gray-100 dark:border-gray-800/60">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-bold tracking-wide text-gray-700 dark:text-gray-300 uppercase">Tài sản Đang Sôi Động</h3>
        </div>
        <div className="space-y-3">
          {TRENDING_ASSETS.map((asset, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:ring-1 hover:ring-indigo-500/20 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-sm shadow-inner group-hover:scale-105 transition-transform">
                  {asset.ticker.substring(0, 2)}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 dark:text-gray-100 text-sm tracking-tight">{asset.ticker}</span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">{asset.name}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-bold text-gray-900 dark:text-white text-[13px]">{asset.price}</span>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded tracking-wide">{asset.change}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
