import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: 'Missing productId' }, { status: 400 });
    }

    const response = await fetch('https://api.fmarket.vn/res/product/get-nav-history', {
      method: 'POST',
      headers: {
        accept: 'application/json, text/plain, */*',
        'content-type': 'application/json',
        'f-language': 'vi',
        origin: 'https://fmarket.vn',
        referer: 'https://fmarket.vn/',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36 Edg/147.0.0.0',
      },
      body: JSON.stringify({
        isAllData: 0,
        productId: Number(productId),
        navPeriod: 'navTo12Months',
      }),
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Fmarket API responded with ${response.status}` },
        { status: 502 },
      );
    }

    const raw = await response.json();
    const navData = raw?.data?.data ?? [];

    return NextResponse.json({ data: navData });
  } catch (error) {
    console.error('Fmarket fund price fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fund price data from Fmarket' },
      { status: 500 },
    );
  }
}
