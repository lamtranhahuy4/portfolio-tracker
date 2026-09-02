'use client';

import React, { useEffect, useState } from 'react';
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DashboardLanguage } from '@/lib/dashboardLocale';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PricePoint {
  time: string;
  price: number;
}

interface HoldingPriceChartProps {
  historicalData?: PricePoint[];
  ticker: string;
  initialPrice: number;
  language: DashboardLanguage;
  height?: number;
}

const copy = {
  vi: {
    price: 'Giá',
    time: 'Thời gian',
  },
  en: {
    price: 'Price',
    time: 'Time',
  },
};

const MAX_DATA_POINTS = 30;

export default function HoldingPriceChart({ 
  ticker, 
  initialPrice, 
  language,
  height = 120,
  historicalData,
}: HoldingPriceChartProps) {
  const t = copy[language];
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);

  useEffect(() => {
    if (historicalData && historicalData.length > 0) {
      setPriceHistory(historicalData);
    } else if (initialPrice > 0) {
      setPriceHistory([{ time: new Date().toLocaleTimeString(), price: initialPrice }]);
    }
  }, [historicalData]);

  useEffect(() => {
    setPriceHistory(prev => {
      const currentPrice = prev[prev.length - 1]?.price;
      if (currentPrice !== initialPrice && initialPrice > 0) {
        const newHistory = [...prev, { time: new Date().toLocaleTimeString(), price: initialPrice }];
        if (newHistory.length > MAX_DATA_POINTS) {
          return newHistory.slice(-MAX_DATA_POINTS);
        }
        return newHistory;
      }
      return prev;
    });
  }, [initialPrice]);

  const latestPrice = priceHistory[priceHistory.length - 1]?.price || initialPrice;
  const firstPrice = priceHistory[0]?.price || initialPrice;
  const change = latestPrice - firstPrice;
  const changePercent = firstPrice > 0 ? (change / firstPrice) * 100 : 0;
  const isUp = change >= 0;

  const chartData = priceHistory.map((point, index) => ({
    ...point,
    index,
  }));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-100">{ticker}</span>
          <div className={`flex items-center gap-1 text-xs ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{isUp ? '+' : ''}{changePercent.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <XAxis dataKey="time" hide />
            <YAxis 
              domain={['dataMin - dataMin * 0.1', 'dataMax + dataMax * 0.1']}
              hide 
            />
            <Tooltip
              formatter={(value: number) => [
                new Intl.NumberFormat('vi-VN', { 
                  style: 'currency', 
                  currency: 'VND',
                  maximumFractionDigits: 0 
                }).format(value),
                t.price
              ]}
              labelFormatter={(label) => `${t.time}: ${label}`}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                color: '#e2e8f0',
                fontSize: '12px',
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={isUp ? '#10b981' : '#f43f5e'}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface HoldingsRealtimeChartProps {
  tickers: string[];
  initialPrices: Record<string, number>;
  language: DashboardLanguage;
}

export function HoldingsRealtimeCharts({ 
  tickers, 
  initialPrices, 
  language 
}: HoldingsRealtimeChartProps) {
  const [historyData, setHistoryData] = useState<Record<string, PricePoint[]>>({});

  useEffect(() => {
    if (tickers.length === 0) return;
    fetch(`/api/history/prices?tickers=${tickers.join(',')}`)
      .then(res => res.json())
      .then(json => {
        if (json.data) setHistoryData(json.data);
      })
      .catch(console.error);
  }, [tickers.join(',')]);

  if (tickers.length === 0 || Object.keys(initialPrices).length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tickers.map((ticker) => (
        <div 
          key={ticker}
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
        >
          <HoldingPriceChart
            ticker={ticker}
            initialPrice={initialPrices[ticker] || 0}
            language={language}
            historicalData={historyData[ticker]}
          />
        </div>
      ))}
    </div>
  );
}