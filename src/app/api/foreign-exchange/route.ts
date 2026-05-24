import { NextResponse } from 'next/server';
import { getForexRates } from '@/lib/foreignExchangeService';
import { addRateLimitHeaders, checkRateLimit, getRateLimitKey } from '@/lib/apiRateLimiter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const rateLimitKey = getRateLimitKey(request);
  const rateLimit = checkRateLimit(rateLimitKey, { maxRequests: 15, windowMs: 60000 });

  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      { error: 'Too many requests', message: 'Vui lòng thử lại sau.' },
      { status: 429 }
    );
    addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime);
    return response;
  }

  const data = await getForexRates();

  const response = NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });

  addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime);
  return response;
}
