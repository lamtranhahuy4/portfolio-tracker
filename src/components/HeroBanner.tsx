'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Loader2, Sparkles } from 'lucide-react';
import { DashboardLanguage } from '@/lib/dashboardLocale';

type MarketCard = {
  name: string;
  price: string;
  change: string;
  percent: string;
  up: boolean;
};

const copy = {
  vi: {
    ready: 'Phiên bản 1.0 Đã Sẵn Sàng',
    greeting: 'Xin chào',
    subtitle: 'Bảng điều khiển thị trường trực tiếp kết nối từ các nguồn dữ liệu hiện có trong hệ thống.',
    marketLabel: 'Widget Thị trường Live',
    loading: 'Đang tải thị trường...',
    unavailable: 'Chưa có dữ liệu',
    vnIndex: 'VN-INDEX',
    gold: 'VÀNG SJC 9999',
    btc: 'BTC/USD',
  },
  en: {
    ready: 'Version 1.0 Ready',
    greeting: 'Welcome back',
    subtitle: 'A live market widget wired to the current price sources already available in the system.',
    marketLabel: 'Live Market Widget',
    loading: 'Loading markets...',
    unavailable: 'Unavailable',
    vnIndex: 'VN-INDEX',
    gold: 'SJC GOLD 9999',
    btc: 'BTC/USD',
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

function normalizeMarketCards(data: MarketCard[], language: DashboardLanguage) {
  const t = copy[language];
  const byName = new Map(data.map((item) => [item.name.toUpperCase(), item]));

  return [
    {
      label: t.vnIndex,
      symbol: 'VNINDEX',
      ...byName.get('VN-INDEX'),
    },
    {
      label: t.gold,
      symbol: 'SJC',
      ...Array.from(byName.values()).find((item) => item.name.toUpperCase().includes('VÀNG') || item.name.toUpperCase().includes('VANG')),
    },
    {
      label: t.btc,
      symbol: 'BTC',
      ...Array.from(byName.values()).find((item) => item.name.toUpperCase().includes('BITCOIN')),
    },
  ].map((item) => ({
    label: item.label,
    symbol: item.symbol,
    price: item.price ?? t.unavailable,
    change: item.change ?? '--',
    percent: item.percent ?? '--',
    up: item.up ?? true,
  }));
}

export default function HeroBanner({ userEmail, language }: { userEmail: string; language: DashboardLanguage }) {
  const t = copy[language];
  const [markets, setMarkets] = useState<MarketCard[]>([]);
  const [loading, setLoading] = useState(true);
  const displayName = useMemo(() => deriveUserName(userEmail), [userEmail]);

  useEffect(() => {
    let active = true;

    const loadMarkets = async () => {
      try {
        const response = await fetch('/api/market-indices', { cache: 'no-store' });
        if (!response.ok) return;
        const marketData = await response.json() as MarketCard[];
        if (active) {
          setMarkets(marketData);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadMarkets();
    const interval = window.setInterval(loadMarkets, 15000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const cards = useMemo(() => normalizeMarketCards(markets, language), [markets, language]);

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

      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
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
        </div>

        <div className="custom-scrollbar flex gap-3 overflow-x-auto pb-2 lg:max-w-[560px]">
          {cards.map((card) => (
            <article key={card.label} className="min-w-[160px] rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 shadow-inner backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{card.symbol}</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-100">{card.label}</h3>
                </div>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                ) : card.up ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-400" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-rose-400" />
                )}
              </div>
              <div className="mt-5">
                <p className="text-2xl font-semibold tracking-tight text-slate-100">{card.price}</p>
                <div className={`mt-2 inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${card.up ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
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
