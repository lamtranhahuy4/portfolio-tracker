import { NextRequest, NextResponse } from 'next/server';
import { getForexHistory } from '@/lib/foreignExchangeService';
import { addRateLimitHeaders, checkRateLimit, getRateLimitKey } from '@/lib/apiRateLimiter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const rateLimitKey = getRateLimitKey(request);
  const rateLimit = checkRateLimit(rateLimitKey, { maxRequests: 30, windowMs: 60000 });

  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      { error: 'Too many requests', message: 'Vui lòng thử lại sau.' },
      { status: 429 }
    );
    addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime);
    return response;
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || 'USD';
  const to = searchParams.get('to') || 'EUR';
  const days = parseInt(searchParams.get('days') || '30', 10);

  if (days < 1 || days > 365) {
    const errorResponse = NextResponse.json(
      { error: 'Invalid days parameter (1-365).' },
      { status: 400 }
    );
    addRateLimitHeaders(errorResponse, rateLimit.remaining, rateLimit.resetTime);
    return errorResponse;
  }

  const data = await getForexHistory(from, to, days);

  const response = NextResponse.json({ pair: `${from}/${to}`, data }, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });

  addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime);
  return response;
}
