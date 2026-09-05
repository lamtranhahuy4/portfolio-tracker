'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Globe, RefreshCw } from 'lucide-react';

interface ForexSummary {
  usdBuyCash: number | null;
  usdBuyTransfer: number | null;
  usdSell: number | null;
  intlCount: number;
  goldCount: number;
  updatedAt: string;
}

const TOP_RATES = ['USD', 'EUR', 'GBP', 'JPY', 'KRW', 'THB'];

export default function ForexMiniWidget() {
  const [summary, setSummary] = useState<ForexSummary | null>(null);
  const [rates, setRates] = useState<{ code: string; name: string; buy: number | null; sell: number | null }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/forex-summary', { cache: 'no-store' });
      if (res.ok) setSummary(await res.json());

      const fullRes = await fetch('/api/foreign-exchange', { cache: 'no-store' });
      if (fullRes.ok) {
        const json = await fullRes.json();
        const list = TOP_RATES
          .map((code) => {
            const r = json.vndPairs?.rates?.find((x: any) => x.code === code);
            return r ? { code, name: r.name, buy: r.buyCash, sell: r.sell } : null;
          })
          .filter(Boolean) as { code: string; name: string; buy: number | null; sell: number | null }[];
        setRates(list);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/forex" className="flex items-center gap-2 text-sm font-semibold text-slate-200 transition-colors hover:text-emerald-400">
          <Globe className="h-4 w-4 text-emerald-400" />
          Tỷ giá
        </Link>
        <button onClick={fetchSummary} disabled={loading} className="p-2 -m-2 text-slate-400 transition-colors hover:text-slate-200">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && rates.length === 0 ? (
        <div className="flex items-center justify-center py-6">
          <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
        </div>
      ) : (
        <div className="space-y-1">
          {rates.map((r) => (
            <div key={r.code} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-slate-800/40">
              <span className="font-semibold text-slate-300">{r.code}</span>
              <span className="text-slate-400">
                {r.buy !== null ? r.buy.toLocaleString('vi-VN') : '-'}
                {' / '}
                {r.sell !== null ? r.sell.toLocaleString('vi-VN') : '-'}
              </span>
            </div>
          ))}
          {rates.length === 0 && (
            <p className="py-4 text-center text-xs text-slate-400">Không có dữ liệu</p>
          )}
        </div>
      )}

      {summary && (
        <div className="mt-2 border-t border-slate-800 pt-2 text-right text-[10px] text-slate-400">
          {summary.intlCount} cặp Q.tế · {summary.goldCount} giá vàng
        </div>
      )}
    </div>
  );
}
