import { NextResponse } from 'next/server';
import { getMarketIndices } from '@/lib/marketData';
import { lenientRateLimit, addRateLimitHeaders, checkRateLimit, getRateLimitKey } from '@/lib/apiRateLimiter';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
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

  const data = await getMarketIndices();

  const response = NextResponse.json(data, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
  
  addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime);
  return response;
}
