import { NextResponse } from 'next/server';
import { getHistoricalPrices } from '@/lib/marketData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const prices = await getHistoricalPrices(['VNINDEX']);
  
  return NextResponse.json({
    prices,
    lastUpdated: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
