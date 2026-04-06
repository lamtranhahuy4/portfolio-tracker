import { NextResponse } from 'next/server';
import { getCachedPrices, cachePrice, getFreshnessStats } from '@/lib/priceService';
import { getRealtimeQuotes } from '@/lib/marketData';

export const dynamic = 'force-dynamic';

interface QuoteRequest {
  tickers: string[];
  forceRefresh?: boolean;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get('tickers');
  const forceRefresh = searchParams.get('forceRefresh') === 'true';

  if (!tickersParam) {
    return NextResponse.json(
      { error: 'Missing tickers parameter' },
      { status: 400 }
    );
  }

  const tickers = tickersParam.split(',').map(t => t.trim()).filter(Boolean);

  try {
    if (forceRefresh) {
      const freshPrices = await getRealtimeQuotes(tickers);
      
      const results = await Promise.all(
        tickers.map(async (ticker) => {
          const price = freshPrices[ticker.toUpperCase()];
          if (price !== undefined) {
            await cachePrice(ticker, price, 'STOCK', 'VND', 'DNSE');
            return { ticker: ticker.toUpperCase(), price, source: 'DNSE', fresh: true };
          }
          return { ticker: ticker.toUpperCase(), price: null, source: null, fresh: false };
        })
      );

      return NextResponse.json({
        quotes: results,
        freshness: await getFreshnessStats(),
        timestamp: new Date().toISOString(),
      });
    }

    const cached = await getCachedPrices(tickers);
    const staleTickers: string[] = [];
    const freshResults: Array<{
      ticker: string;
      price: number;
      source: string | null;
      fresh: boolean;
      isManualOverride: boolean;
    }> = [];

    for (const ticker of tickers) {
      const upperTicker = ticker.toUpperCase();
      const cachedData = cached.get(upperTicker);

      if (cachedData && cachedData.isFresh) {
        freshResults.push({
          ticker: upperTicker,
          price: cachedData.price,
          source: cachedData.source,
          fresh: true,
          isManualOverride: cachedData.isManualOverride,
        });
      } else if (cachedData && !cachedData.isFresh && !cachedData.isStale) {
        freshResults.push({
          ticker: upperTicker,
          price: cachedData.price,
          source: cachedData.source,
          fresh: false,
          isManualOverride: cachedData.isManualOverride,
        });
      } else {
        staleTickers.push(upperTicker);
      }
    }

    if (staleTickers.length > 0) {
      const freshPrices = await getRealtimeQuotes(staleTickers);
      
      for (const ticker of staleTickers) {
        const price = freshPrices[ticker];
        if (price !== undefined) {
          await cachePrice(ticker, price, 'STOCK', 'VND', 'DNSE');
          freshResults.push({
            ticker,
            price,
            source: 'DNSE',
            fresh: true,
            isManualOverride: false,
          });
        }
      }
    }

    return NextResponse.json({
      quotes: freshResults,
      freshness: await getFreshnessStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Quote API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}
