import { NextResponse } from 'next/server';
import { getTrendingAssets } from '@/lib/marketData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const data = await getTrendingAssets();

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
