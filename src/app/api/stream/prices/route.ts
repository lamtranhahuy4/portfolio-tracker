import { NextResponse } from 'next/server';
import { getRealtimeQuotes } from '@/lib/marketData';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}