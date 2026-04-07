import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000,
};

export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const url = new URL(request.url).pathname;
  return `${ip}:${url}`;
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  
  let entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
    return { allowed: true, remaining: config.maxRequests - 1, resetTime: entry.resetTime };
  }
  
  entry.count++;
  
  if (entry.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }
  
  return { allowed: true, remaining: config.maxRequests - entry.count, resetTime: entry.resetTime };
}

export function addRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  resetTime: number
): NextResponse {
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', Math.floor(resetTime / 1000).toString());
  response.headers.set('X-RateLimit-Limit', DEFAULT_CONFIG.maxRequests.toString());
  return response;
}

export function rateLimitMiddleware(config: RateLimitConfig = DEFAULT_CONFIG) {
  return async function rateLimit(
    request: Request,
    customKey?: string
  ): Promise<{ allowed: boolean; response?: NextResponse }> {
    const key = customKey || getRateLimitKey(request);
    const result = checkRateLimit(key, config);
    
    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      const response = NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Vui lòng thử lại sau.',
          retryAfter,
        },
        { status: 429 }
      );
      
      response.headers.set('Retry-After', retryAfter.toString());
      addRateLimitHeaders(response, 0, result.resetTime);
      
      return { allowed: false, response };
    }
    
    return { allowed: true };
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

export const strictRateLimit = rateLimitMiddleware({
  maxRequests: 10,
  windowMs: 60 * 1000,
});

export const lenientRateLimit = rateLimitMiddleware({
  maxRequests: 200,
  windowMs: 60 * 1000,
});
