import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker } from '../circuitBreaker';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initial state is CLOSED', () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.isOpen()).toBe(false);
  });

  it('opens after consecutive failures reach the threshold', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2 });
    
    await expect(cb.execute(() => Promise.reject(new Error('fail 1')))).rejects.toThrow('fail 1');
    expect(cb.getState()).toBe('CLOSED'); // 1 failure, threshold is 2
    
    await expect(cb.execute(() => Promise.reject(new Error('fail 2')))).rejects.toThrow('fail 2');
    expect(cb.getState()).toBe('OPEN'); // 2 failures, threshold reached
    expect(cb.isOpen()).toBe(true);
  });

  it('throws CircuitBreakerError when OPEN', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    
    await expect(cb.execute(() => Promise.resolve('success'))).rejects.toThrow(/Circuit breaker is OPEN/);
  });

  it('after resetTimeout, it goes to HALF_OPEN state', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, timeout: 1000 });
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    expect(cb.getState()).toBe('OPEN');
    
    vi.advanceTimersByTime(1000);
    expect(cb.getState()).toBe('HALF_OPEN');
  });

  it('if HALF_OPEN and a request succeeds, it CLOSES', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, successThreshold: 2, timeout: 1000 });
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    vi.advanceTimersByTime(1000);
    expect(cb.getState()).toBe('HALF_OPEN');
    
    // First success (threshold is 2)
    const result1 = await cb.execute(() => Promise.resolve('success 1'));
    expect(result1).toBe('success 1');
    expect(cb.getState()).toBe('HALF_OPEN');

    // Second success
    const result2 = await cb.execute(() => Promise.resolve('success 2'));
    expect(result2).toBe('success 2');
    expect(cb.getState()).toBe('CLOSED');
  });

  it('if HALF_OPEN and a request fails, it OPENS again', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, timeout: 1000 });
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    vi.advanceTimersByTime(1000);
    expect(cb.getState()).toBe('HALF_OPEN');
    
    await expect(cb.execute(() => Promise.reject(new Error('fail 2')))).rejects.toThrow('fail 2');
    expect(cb.getState()).toBe('OPEN');
  });

  it('getStats returns correct stats', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, timeout: 5000 });
    expect(cb.getStats().state).toBe('CLOSED');
    expect(cb.getStats().failures).toBe(0);
    expect(cb.getStats().retryAfter).toBe(0);
    
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    expect(cb.getStats().failures).toBe(1);
    
    await expect(cb.execute(() => Promise.reject(new Error('fail 2')))).rejects.toThrow();
    expect(cb.getStats().state).toBe('OPEN');
    expect(cb.getStats().retryAfter).toBeGreaterThan(0);
    expect(cb.getStats().retryAfter).toBeLessThanOrEqual(5000);
  });

  it('forceReset resets to CLOSED state', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1 });
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    expect(cb.getState()).toBe('OPEN');
    
    cb.forceReset();
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.getStats().failures).toBe(0);
  });

  it('successes reset failures when CLOSED', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2 });
    await expect(cb.execute(() => Promise.reject(new Error('fail')))).rejects.toThrow();
    expect(cb.getStats().failures).toBe(1);
    
    await cb.execute(() => Promise.resolve('success'));
    expect(cb.getStats().failures).toBe(0);
  });
});
