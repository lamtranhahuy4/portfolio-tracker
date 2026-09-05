'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, DollarSign } from 'lucide-react';
import { ForexResponse } from '@/lib/foreignExchangeService';

function formatRate(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function getDecimals(currency: string): number {
  if (currency === 'VND' || currency === 'JPY' || currency === 'KRW') return 0;
  if (currency === 'THB' || currency === 'HKD') return 2;
  return 4;
}

interface Props {
  data: ForexResponse;
}

const VND_RATE_CODES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SGD', 'CNY', 'KRW', 'THB', 'HKD', 'MYR', 'NZD'];
const COMMON_CURRENCIES = ['VND', ...VND_RATE_CODES, 'SEK', 'NOK', 'DKK', 'INR', 'MXN', 'ZAR', 'TRY', 'BRL', 'TWD'];

export default function ForexConverter({ data }: Props) {
  const [amount, setAmount] = useState('1');
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('VND');

  const vndRatesMap = useMemo(() => {
    const map: Record<string, { buyCash: number | null; buyTransfer: number | null; sell: number | null }> = {};
    for (const r of data.vndPairs.rates) {
      map[r.code] = { buyCash: r.buyCash, buyTransfer: r.buyTransfer, sell: r.sell };
    }
    return map;
  }, [data]);

  const intlRatesMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of data.international.rates) {
      map[r.currency] = r.rate;
    }
    return map;
  }, [data]);

  const result = useMemo(() => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0 || from === to) return null;

    // Helper to get rate from VND to any currency (via VCB sell rate)
    function vndTo(code: string): number | null {
      return vndRatesMap[code]?.sell ?? null;
    }

    // Helper: rate = 1 unit of `from` in terms of `to`
    function getRate(f: string, t: string): number | null {
      if (f === 'VND') {
        const sell = vndTo(t);
        if (sell) return 1 / sell;
        return null;
      }
      if (t === 'VND') {
        return vndTo(f);
      }
      // Both are international: cross-rate via USD
      const fToUsd = f === 'USD' ? 1 : intlRatesMap[f];
      const tToUsd = t === 'USD' ? 1 : intlRatesMap[t];
      if (fToUsd && tToUsd) return fToUsd / tToUsd;

      // Try via VND
      const fToVnd = vndTo(f);
      const tToVnd = vndTo(t);
      if (fToVnd && tToVnd) return fToVnd / tToVnd;

      return null;
    }

    const rate = getRate(from, to);
    if (!rate) return null;
    return num * rate;
  }, [amount, from, to, vndRatesMap, intlRatesMap]);

  return (
    <section className="rounded-[28px] border border-slate-800/80 bg-slate-900/60 p-6 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
        <DollarSign className="h-5 w-5 text-emerald-400" />
        Currency Converter
      </h2>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[120px]">
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={0}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-emerald-600"
          />
        </div>

        <div className="flex-1 min-w-[120px]">
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400">From</label>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-emerald-600"
          >
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => { setFrom(to); setTo(from); }}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/80 text-slate-300 transition-colors hover:bg-slate-700"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>

        <div className="flex-1 min-w-[120px]">
          <label className="mb-1 block text-[11px] uppercase tracking-wider text-slate-400">To</label>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-emerald-600"
          >
            {COMMON_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {result !== null && (
        <div className="mt-4 rounded-2xl border border-slate-700/80 bg-slate-800/40 px-5 py-4">
          <p className="text-xs text-slate-400">
            {formatRate(parseFloat(amount || '0'), getDecimals(from))} {from}
          </p>
          <p className="text-2xl font-semibold text-emerald-300">
            {formatRate(result, getDecimals(to))} {to}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            1 {from} = {formatRate(result / parseFloat(amount || '1'), getDecimals(to))} {to}
          </p>
        </div>
      )}
    </section>
  );
}
