import { NextResponse } from 'next/server';
import { getRealtimeQuotes } from '@/lib/marketData';
import { requireUser, UnauthorizedError } from '@/lib/auth';
import { checkRateLimit, getRateLimitKey, addRateLimitHeaders } from '@/lib/apiRateLimiter';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await requireUser();

    const rateLimitKey = getRateLimitKey(request);
    const rateLimit = checkRateLimit(rateLimitKey, { maxRequests: 30, windowMs: 60000 });
    if (!rateLimit.allowed) {
      const response = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime);
      return response;
    }

    const { searchParams } = new URL(request.url);
    const tickersParam = searchParams.get('tickers');
    
    if (!tickersParam) {
      return NextResponse.json(
        { error: 'Missing tickers parameter' },
        { status: 400 }
      );
    }

    const tickers = tickersParam.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);
    
    if (tickers.length === 0) {
      return NextResponse.json(
        { error: 'No valid tickers provided' },
        { status: 400 }
      );
    }

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        const sendUpdate = async () => {
          try {
            if (controller.desiredSize !== null && controller.desiredSize <= 0) {
              return; // Backpressure: skip this update until consumer catches up
            }

            const freshPrices = await getRealtimeQuotes(tickers);
            
            const updates = tickers.map(ticker => ({
              ticker,
              price: freshPrices[ticker] ?? null,
              timestamp: new Date().toISOString(),
            })).filter(update => update.price !== null);
            
            if (updates.length > 0) {
              const data = `data: ${JSON.stringify(updates)}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          } catch (error) {
            console.error('SSE price update error:', error);
          }
        };

        await sendUpdate();

        const interval = setInterval(async () => {
          try {
            await sendUpdate();
          } catch (error) {
            console.error('SSE interval error:', error);
          }
        }, 5000);

        request.signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });
      },
    });

    const headers: Record<string, string> = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    };
    headers['X-RateLimit-Remaining'] = String(rateLimit.remaining);
    headers['X-RateLimit-Reset'] = String(Math.floor(rateLimit.resetTime / 1000));
    headers['X-RateLimit-Limit'] = '30';

    return new NextResponse(stream, { headers });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('SSE stream error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}