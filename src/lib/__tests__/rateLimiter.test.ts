import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { checkRateLimit, getRateLimitKey, addRateLimitHeaders } from '../apiRateLimiter';

describe('getRateLimitKey', () => {
  it('should use x-forwarded-for header', () => {
    const request = new Request('https://example.com/api/test', {
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });
    const key = getRateLimitKey(request);
    expect(key).toBe('192.168.1.1:/api/test');
  });

  it('should fallback to unknown when no IP header', () => {
    const request = new Request('https://example.com/api/test');
    const key = getRateLimitKey(request);
    expect(key).toContain('/api/test');
  });
});

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow first request', () => {
    const result = checkRateLimit('test-key', { maxRequests: 5, windowMs: 60000 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('should block when exceeding limit', () => {
    const result1 = checkRateLimit('test-key-2', { maxRequests: 3, windowMs: 60000 });
    expect(result1.allowed).toBe(true);

    const result2 = checkRateLimit('test-key-2', { maxRequests: 3, windowMs: 60000 });
    expect(result2.allowed).toBe(true);

    const result3 = checkRateLimit('test-key-2', { maxRequests: 3, windowMs: 60000 });
    expect(result3.allowed).toBe(true);

    const result4 = checkRateLimit('test-key-2', { maxRequests: 3, windowMs: 60000 });
    expect(result4.allowed).toBe(false);
    expect(result4.remaining).toBe(0);
  });

  it('should reset after window expires', () => {
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

    const result1 = checkRateLimit('test-key-3', { maxRequests: 1, windowMs: 60000 });
    expect(result1.allowed).toBe(true);

    const result2 = checkRateLimit('test-key-3', { maxRequests: 1, windowMs: 60000 });
    expect(result2.allowed).toBe(false);

    vi.advanceTimersByTime(60001);

    const result3 = checkRateLimit('test-key-3', { maxRequests: 1, windowMs: 60000 });
    expect(result3.allowed).toBe(true);
  });
});

describe('addRateLimitHeaders', () => {
  it('should set rate limit headers on response', () => {
    const response = new Response();
    const nextResponse = addRateLimitHeaders(response as any, 5, 9999999999);

    expect(nextResponse.headers.get('X-RateLimit-Remaining')).toBe('5');
    expect(nextResponse.headers.get('X-RateLimit-Limit')).toBe('100');
  });
});
