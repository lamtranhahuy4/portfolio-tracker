import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/index';
import { goldPricesCache, goldHistoryCache } from '@/db/schema';
import { getGoldPrices, getGoldHistory } from '@/lib/goldPriceService';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const daysParam = searchParams.get('days');

  if (type) {
    return handleHistory(type, daysParam ? parseInt(daysParam, 10) : 30);
  }

  return handlePrices();
}

async function handlePrices() {
  try {
    const goldData = await getGoldPrices();

    if (goldData.prices.length > 0) {
      await cachePrices(goldData.prices);
      return NextResponse.json({
        success: true,
        prices: goldData.prices,
        updatedAt: goldData.updatedAt,
        source: 'live',
      });
    }
  } catch {
  }

  const cached = await db
    .select()
    .from(goldPricesCache)
    .orderBy(goldPricesCache.updatedAt)
    .limit(100);

  if (cached.length > 0) {
    const prices = cached.map((c) => ({
      type: c.type,
      name: c.name,
      buy: Number(c.buy),
      sell: Number(c.sell),
      changeBuy: Number(c.changeBuy),
      changeSell: Number(c.changeSell),
      currency: c.currency,
    }));
    return NextResponse.json({
      success: true,
      prices,
      updatedAt: cached[0].updatedAt.toISOString(),
      source: 'cache',
    });
  }

  return NextResponse.json({ success: false, prices: [], source: 'none' });
}

async function handleHistory(type: string, days: number) {
  try {
    const history = await getGoldHistory(type, days);

    if (history.length > 0) {
      await cacheHistory(type, history);
      return NextResponse.json({ success: true, history, source: 'live' });
    }
  } catch {
  }

  const cached = await db
    .select()
    .from(goldHistoryCache)
    .where(eq(goldHistoryCache.type, type))
    .orderBy(goldHistoryCache.date);

  if (cached.length > 0) {
    const history = cached.map((c) => ({
      date: c.date,
      buy: Number(c.buy),
      sell: Number(c.sell),
    }));
    return NextResponse.json({ success: true, history, source: 'cache' });
  }

  return NextResponse.json({ success: false, history: [], source: 'none' });
}

async function cachePrices(prices: { type: string; name: string; buy: number; sell: number; changeBuy: number; changeSell: number; currency: string }[]) {
  for (const p of prices) {
    await db
      .insert(goldPricesCache)
      .values({
        type: p.type,
        name: p.name,
        buy: p.buy.toString(),
        sell: p.sell.toString(),
        changeBuy: p.changeBuy.toString(),
        changeSell: p.changeSell.toString(),
        currency: p.currency,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: goldPricesCache.type,
        set: {
          name: p.name,
          buy: p.buy.toString(),
          sell: p.sell.toString(),
          changeBuy: p.changeBuy.toString(),
          changeSell: p.changeSell.toString(),
          currency: p.currency,
          updatedAt: new Date(),
        },
      });
  }
}

async function cacheHistory(type: string, history: { date: string; buy: number; sell: number }[]) {
  await db.delete(goldHistoryCache).where(eq(goldHistoryCache.type, type));

  if (history.length === 0) return;

  await db.insert(goldHistoryCache).values(
    history.map((h) => ({
      type,
      date: h.date,
      buy: h.buy.toString(),
      sell: h.sell.toString(),
      updatedAt: new Date(),
    }))
  );
}
