import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from '../retry';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the result if the function succeeds on the first try', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries the specified number of times if the function fails', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success');
      
    const promise = withRetry(fn, { maxRetries: 2, baseDelayMs: 100 });
    
    // Let the first rejection happen
    await Promise.resolve();
    await Promise.resolve();
    vi.advanceTimersByTime(100);
    
    // Let the second rejection happen
    await Promise.resolve();
    await Promise.resolve();
    vi.advanceTimersByTime(200);
    
    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws the last error if it fails after all retries', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));
    
    const promise = withRetry(fn, { maxRetries: 1, baseDelayMs: 100 });
    
    await Promise.resolve();
    await Promise.resolve();
    vi.advanceTimersByTime(100);
    
    await expect(promise).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(2);
  });
  
  it('uses default maxRetries and baseDelayMs if options not provided', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');
      
    const promise = withRetry(fn);
    
    await Promise.resolve();
    await Promise.resolve();
    vi.advanceTimersByTime(1000); // Default baseDelayMs is 1000
    
    const result = await promise;
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws Unreachable error if maxRetries is negative', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    await expect(withRetry(fn, { maxRetries: -1 })).rejects.toThrow('Unreachable');
  });
});
