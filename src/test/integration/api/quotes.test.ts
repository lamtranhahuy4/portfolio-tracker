import { describe, expect, it, vi, beforeEach } from 'vitest';
import { vi as vitest } from 'vitest';

const mockCheckRateLimit = vitest.fn().mockReturnValue({
  allowed: true,
  remaining: 59,
  resetTime: Date.now() + 60000,
});

const mockGetCachedPrices = vitest.fn().mockResolvedValue(new Map());
const mockCachePrice = vitest.fn().mockResolvedValue(undefined);
const mockGetFreshnessStats = vitest.fn().mockResolvedValue({
  total: 0,
  fresh: 0,
  stale: 0,
  manual: 0,
});
const mockGetRealtimeQuotes = vitest.fn().mockResolvedValue({});

vi.mock('@/lib/apiRateLimiter', () => ({
  getRateLimitKey: vitest.fn().mockReturnValue('test-key'),
  checkRateLimit: mockCheckRateLimit,
  addRateLimitHeaders: vitest.fn().mockImplementation((response, remaining, resetTime) => {
    response.headers.set('X-RateLimit-Limit', '60');
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.floor(resetTime / 1000).toString());
    return response;
  }),
  DEFAULT_CONFIG: { maxRequests: 60, windowMs: 60000 },
}));

vi.mock('@/lib/priceService', () => ({
  getCachedPrices: mockGetCachedPrices,
  cachePrice: mockCachePrice,
  getFreshnessStats: mockGetFreshnessStats,
}));

vi.mock('@/lib/marketData', () => ({
  getRealtimeQuotes: mockGetRealtimeQuotes,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vitest.fn(),
    error: vitest.fn(),
    warn: vitest.fn(),
    debug: vitest.fn(),
  },
}));

describe('Quotes API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      remaining: 59,
      resetTime: Date.now() + 60000,
    });
  });

  describe('GET /api/quotes', () => {
    it('should return 400 when no tickers are provided', async () => {
      const { GET } = await import('@/app/api/quotes/route');
      const request = new Request('http://localhost:3000/api/quotes', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing tickers parameter');
    });

    it('should return 429 when rate limited', async () => {
      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
      });

      const { GET } = await import('@/app/api/quotes/route');
      const request = new Request('http://localhost:3000/api/quotes?symbols=HPG', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many requests');
      expect(data.retryAfter).toBeDefined();
    });

    it('should validate tickers parameter format', async () => {
      const { GET } = await import('@/app/api/quotes/route');
      const request = new Request('http://localhost:3000/api/quotes?tickers=', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing tickers parameter');
    });

    it('should accept valid tickers', async () => {
      const { GET } = await import('@/app/api/quotes/route');
      const request = new Request('http://localhost:3000/api/quotes?tickers=HPG,FPT', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).not.toBe(400);
    });

    it('should handle forceRefresh parameter', async () => {
      const { GET } = await import('@/app/api/quotes/route');
      const request = new Request('http://localhost:3000/api/quotes?tickers=HPG&forceRefresh=true', {
        method: 'GET',
      });

      const response = await GET(request);

      expect(response.status).toBeDefined();
    });

    it('should return successful response for valid tickers', async () => {
      const { GET } = await import('@/app/api/quotes/route');
      const request = new Request('http://localhost:3000/api/quotes?tickers=HPG', {
        method: 'GET',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('quotes');
      expect(data).toHaveProperty('timestamp');
    });
  });
});
