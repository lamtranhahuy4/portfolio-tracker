'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState, useRef } from 'react';
import { ArrowDownRight, ArrowUpRight, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { DashboardLanguage } from '@/lib/dashboardLocale';

const MARKET_REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

type MarketCard = {
  name: string;
  price: string;
  change: string;
  percent: string;
  up: boolean;
};

type DisplayCard = {
  label: string;
  symbol: string;
  price: string;
  change: string;
  percent: string;
  up: boolean;
};

const copy = {
  vi: {
    ready: 'Dữ liệu thị trường real-time',
    greeting: 'Xin chào',
    subtitle: 'Cập nhật từ DNSE (VN-INDEX), CoinGecko (Crypto), Gold API (Vàng).',
    marketLabel: 'Widget Thị trường Live',
    loading: 'Đang tải...',
    unavailable: 'Đang cập nhật',
    vnIndex: 'VN-INDEX',
    gold: 'VÀNG SJC 9999',
    btc: 'BTC/USD',
    eth: 'ETH/USD',
    lastUpdate: 'Cập nhật lúc',
  },
  en: {
    ready: 'Real-time Market Data',
    greeting: 'Welcome back',
    subtitle: 'Updated from DNSE (VN-INDEX), CoinGecko (Crypto), Gold API (Gold).',
    marketLabel: 'Live Market Widget',
    loading: 'Loading...',
    unavailable: 'Updating',
    vnIndex: 'VN-INDEX',
    gold: 'SJC GOLD 9999',
    btc: 'BTC/USD',
    eth: 'ETH/USD',
    lastUpdate: 'Updated at',
  },
} satisfies Record<DashboardLanguage, Record<string, string>>;

function deriveUserName(userEmail: string) {
  const local = userEmail.split('@')[0] || userEmail;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function normalizeMarketCards(data: MarketCard[], language: DashboardLanguage): DisplayCard[] {
  const t = copy[language];
  const byName = new Map(data.map((item) => [item.name.toUpperCase(), item]));

  const defaults: Record<string, DisplayCard> = {
    'VN-INDEX': { label: t.vnIndex, symbol: 'VN-INDEX', price: t.unavailable, change: '--', percent: '--', up: true },
    'BITCOIN': { label: t.btc, symbol: 'BTC', price: t.unavailable, change: '--', percent: '--', up: true },
    'ETHEREUM': { label: t.eth, symbol: 'ETH', price: t.unavailable, change: '--', percent: '--', up: true },
    'VANG SJC 9999': { label: t.gold, symbol: 'SJC', price: t.unavailable, change: '--', percent: '--', up: true },
  };

  const getCard = (key: string): DisplayCard => {
    const found = byName.get(key);
    if (found) {
      return { ...defaults[key], price: found.price, change: found.change, percent: found.percent, up: found.up };
    }
    return defaults[key];
  };

  return [
    getCard('VN-INDEX'),
    getCard('BITCOIN'),
    getCard('ETHEREUM'),
    getCard('VANG SJC 9999'),
  ];
}

export default function HeroBanner({ userEmail, language }: { userEmail: string; language: DashboardLanguage }) {
  const t = copy[language];
  const [markets, setMarkets] = useState<MarketCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const displayName = useMemo(() => deriveUserName(userEmail), [userEmail]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const response = await fetch('/api/market-indices', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const marketData = await response.json() as MarketCard[];
        if (active) {
          setMarkets(marketData);
          setLastUpdate(new Date());
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (active) {
          setError((err as Error).message);
          console.error('Failed to load market data:', err);
        }
      }
    };

    fetchData();
    intervalRef.current = setInterval(fetchData, MARKET_REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const cards = useMemo(() => normalizeMarketCards(markets, language), [markets, language]);
  const isAllUnavailable = cards.every(c => c.price === t.unavailable);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit' 
    });
  };

  return (
    <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-md md:p-8">
      <Image
        src="/hero-banner.jpg"
        alt="Hero banner"
        fill
        priority
        className="object-cover object-center opacity-20"
        sizes="(min-width: 1024px) 1200px, 100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/82 to-slate-950/72" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.1),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.24),transparent_42%)]" />
      <div className="pointer-events-none absolute right-0 top-0 -mr-20 -mt-20 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 -mb-20 -ml-20 h-60 w-60 rounded-full bg-emerald-600/10 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between xl:gap-8">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
            <Sparkles className="h-4 w-4 text-amber-300" />
            {t.ready}
          </div>

          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.28em] text-slate-500">{t.marketLabel}</p>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-100 md:text-4xl">
              {t.greeting}{' '}
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                {displayName}
              </span>
            </h2>
            <p className="max-w-xl text-sm leading-6 text-slate-300">{t.subtitle}</p>
          </div>

          {(lastUpdate || error) && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>{t.loading}</span>
                </>
              ) : error ? (
                <>
                  <RefreshCw className="h-3 w-3 text-rose-400" />
                  <span className="text-rose-400">Lỗi: {error}</span>
                </>
              ) : lastUpdate ? (
                <>
                  <span>{t.lastUpdate}: {formatTime(lastUpdate)}</span>
                  {isAllUnavailable && <span className="text-amber-400">({t.unavailable})</span>}
                </>
              ) : null}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:flex xl:gap-3">
          {cards.map((card) => (
            <article 
              key={card.label} 
              className="min-w-0 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 shadow-inner backdrop-blur-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[10px] uppercase tracking-[0.18em] text-slate-500">{card.symbol}</p>
                  <h3 className="truncate text-xs font-semibold text-slate-100">{card.label}</h3>
                </div>
                {loading || card.price === t.unavailable ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500 shrink-0" />
                ) : card.up ? (
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                )}
              </div>
              <div className="mt-3">
                <p className="truncate text-lg font-semibold tracking-tight text-slate-100">{card.price}</p>
                <div className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${card.up ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                  <span>{card.change}</span>
                  <span>{card.percent}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
