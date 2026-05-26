import { NextResponse } from 'next/server';
import { getForexRates } from '@/lib/foreignExchangeService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await getForexRates();

  const usdRate = data.vndPairs.rates.find((r) => r.code === 'USD');

  const summary = {
    usdBuyCash: usdRate?.buyCash ?? null,
    usdBuyTransfer: usdRate?.buyTransfer ?? null,
    usdSell: usdRate?.sell ?? null,
    intlCount: data.international.rates.length,
    goldCount: data.gold.prices.length,
    updatedAt: data.vndPairs.updatedAt,
  };

  return NextResponse.json(summary, {
    headers: { 'Cache-Control': 'public, max-age=120, s-maxage=120' },
  });
}
