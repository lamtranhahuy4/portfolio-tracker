'use client';

import React, { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Clock, Activity, Globe, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchMarketIndices } from '@/actions/market';

const TRENDING_ASSETS = [
  { ticker: 'FPT', name: 'Công ty Cổ phần FPT', price: '115,000 ₫', change: '+2.5%' },
  { ticker: 'VCB', name: 'Ngân hàng Vietcombank', price: '95,400 ₫', change: '+1.2%' },
  { ticker: 'NVDA', name: 'Nvidia Corp', price: '$850.50', change: '+3.8%' },
];

export default function MarketOverview() {
  const [indices, setIndices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const refreshData = () => {
    setLoading(true);
    fetchMarketIndices().then(data => {
      setIndices(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    refreshData();
    // Auto refresh every 5 phút
    const interval = setInterval(refreshData, 300000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 flex flex-col transition-all hover:shadow-md">
      <div className="flex items-center justify-between mb-5 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Thị trường Thế giới (Live API)</h2>
        </div>
        <button 
          onClick={refreshData}
          disabled={loading}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ring-1 transition-all ${
            loading 
              ? 'text-indigo-700 bg-indigo-50 ring-indigo-200 cursor-not-allowed' 
              : 'text-emerald-700 bg-emerald-50 ring-emerald-200 hover:bg-emerald-100 cursor-pointer'
          } dark:bg-transparent dark:ring-gray-700`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-emerald-600'}`} />
          <span>{loading ? 'Đang cập nhật Radar...' : 'Dữ liệu Thời gian thực'}</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {loading && indices.length === 0 ? (
          [1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800/40 animate-pulse rounded-xl"></div>)
        ) : indices.length > 0 ? (
          indices.map((idx, i) => (
            <div key={i} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 flex flex-col gap-1 transition-all hover:-translate-y-1 hover:shadow-sm cursor-default">
              <span className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-400 uppercase">{idx.name}</span>
              <span className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white mt-1">{idx.price}</span>
              <div className={`flex items-center gap-1 text-[11px] font-bold mt-0.5 ${idx.up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {idx.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{idx.change} ({idx.percent})</span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-4 text-center text-sm text-gray-400 py-3 flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <span>Đã vượt quá giới hạn API từ Yahoo Finance hoặc mất kết nối mạng.</span>
          </div>
        )}
      </div>

      <div className="flex-1 bg-gray-50/30 dark:bg-gray-800/10 rounded-xl p-4 border border-gray-100 dark:border-gray-800/60">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-orange-500" />
          <h3 className="text-sm font-bold tracking-wide text-gray-700 dark:text-gray-300 uppercase">Tài sản Đặc trưng</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TRENDING_ASSETS.map((asset, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:ring-1 hover:ring-indigo-500/20 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shadow-inner group-hover:scale-105 transition-transform">
                  {asset.ticker.substring(0, 2)}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-gray-900 dark:text-gray-100 text-[13px] tracking-tight">{asset.ticker}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{asset.name}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-bold text-gray-900 dark:text-white text-[13px]">{asset.price}</span>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-[2px] rounded tracking-wide">{asset.change}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
