import { NextResponse } from 'next/server';
import { getHistoricalPrices } from '@/lib/marketData';
import { lenientRateLimit, addRateLimitHeaders, checkRateLimit, getRateLimitKey } from '@/lib/apiRateLimiter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HistoricalPricesResponse {
  prices: Record<string, Record<string, number>>;
  lastUpdated: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickers = searchParams.get('tickers');

  if (!tickers) {
    return NextResponse.json({ error: 'Missing tickers parameter' }, { status: 400 });
  }

  const tickerList = tickers.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
  if (tickerList.length === 0) {
    return NextResponse.json({ prices: {}, lastUpdated: new Date().toISOString() });
  }

  const rateLimitKey = getRateLimitKey(request);
  const rateLimit = checkRateLimit(rateLimitKey, { maxRequests: 60, windowMs: 60000 });
  
  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      { error: 'Too many requests', message: 'Vui lòng thử lại sau.' },
      { status: 429 }
    );
    addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime);
    return response;
  }

  const historicalPrices = await getHistoricalPrices(tickerList);

  const response = NextResponse.json({
    prices: historicalPrices,
    lastUpdated: new Date().toISOString(),
  } satisfies HistoricalPricesResponse, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
  
  addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime);
  return response;
}
