import { NextResponse } from 'next/server';
import { getRealtimeQuotes } from '@/lib/marketData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbols = (searchParams.get('symbols') ?? '')
    .split(',')
    .map((symbol) => symbol.trim())
    .filter(Boolean);

  const quotes = await getRealtimeQuotes(symbols);

  return NextResponse.json(quotes, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
