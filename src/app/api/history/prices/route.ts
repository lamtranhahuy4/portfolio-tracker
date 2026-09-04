import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { priceHistory } from '@/db/schema';
import { inArray, desc, and, gte } from 'drizzle-orm';
import { checkRateLimit } from '@/lib/apiRateLimiter';
import { getCurrentUser } from '@/lib/auth';
import { fetchDnseSeries } from '@/lib/marketData';

export async function GET(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  
  const rateCheck = checkRateLimit(`history-prices:${ip}`);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get('tickers');
  
  if (!tickersParam) {
    return NextResponse.json({ error: 'Missing tickers parameter' }, { status: 400 });
  }

  const tickers = tickersParam.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
  
  if (tickers.length === 0) {
    return NextResponse.json({ data: {} });
  }

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const nowUnix = Math.floor(Date.now() / 1000);
  const fromUnix = nowUnix - 24 * 60 * 60;

  try {
    const result: Record<string, { time: string, price: number }[]> = {};
    tickers.forEach(t => { result[t] = []; });

    // Fetch from DNSE API for intraday history
    await Promise.all(tickers.map(async (ticker) => {
      const isIndex = ['VNINDEX', 'VN30', 'HNX', 'HNX30', 'UPCOM'].includes(ticker);
      const series = await fetchDnseSeries(ticker, isIndex, '1', fromUnix, nowUnix);
      
      if (series && series.length > 0) {
        result[ticker] = series.map(s => ({
          time: new Date(s.time * 1000).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
          price: s.price * (isIndex ? 1 : 1000)
        }));
      } else {
        // Fallback to DB
        const history = await db
          .select({
            price: priceHistory.price,
            recordedAt: priceHistory.recordedAt,
          })
          .from(priceHistory)
          .where(
            and(
              inArray(priceHistory.ticker, [ticker]),
              gte(priceHistory.recordedAt, oneDayAgo)
            )
          )
          .orderBy(desc(priceHistory.recordedAt));
          
        const reversedHistory = [...history].reverse();
        for (const record of reversedHistory) {
          if (record.price && record.recordedAt) {
            result[ticker].push({
              time: record.recordedAt.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
              price: Number(record.price)
            });
          }
        }
      }
    }));

    // Limit to max 30 points per ticker so the chart doesn't get cluttered
    for (const t of tickers) {
      if (result[t].length > 30) {
        // keep evenly distributed 30 points
        const original = result[t];
        const step = original.length / 30;
        const sampled = [];
        for (let i = 0; i < 30; i++) {
          sampled.push(original[Math.floor(i * step)]);
        }
        result[t] = sampled;
      }
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error fetching price history:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
