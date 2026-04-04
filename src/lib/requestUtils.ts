/**
 * Request deduplication utilities to prevent redundant API calls.
 * Useful for preventing multiple simultaneous requests to the same endpoint.
 */

const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * Deduplicates requests with the same key.
 * If a request with the same key is already pending, returns the existing promise.
 * Once resolved, the promise is removed from the cache.
 * 
 * @example
 * const result = await dedupeFetch('quotes-HPG-FPT', () => fetch('/api/quotes?symbols=HPG,FPT'));
 */
export async function dedupeFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  const promise = fetcher().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Clears all pending requests. Useful for cleanup during unmount.
 */
export function clearPendingRequests(): void {
  pendingRequests.clear();
}

/**
 * Gets the number of currently pending requests.
 * Useful for debugging and monitoring.
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size;
}

/**
 * Rate limiter to prevent API abuse.
 * Ensures minimum interval between requests.
 */
export class RateLimiter {
  private lastCall = 0;
  private readonly minInterval: number;

  constructor(minIntervalMs: number = 1000) {
    this.minInterval = minIntervalMs;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;

    if (timeSinceLastCall < this.minInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minInterval - timeSinceLastCall)
      );
    }

    this.lastCall = Date.now();
    return fn();
  }
}

/**
 * Creates a debounced version of a function.
 * Delays execution until after `wait` milliseconds of inactivity.
 */
export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  wait: number
): (...args: TArgs) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: TArgs) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, wait);
  };
}

/**
 * Creates a throttled version of a function.
 * Ensures the function is called at most once per `limit` milliseconds.
 */
export function throttle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  limit: number
): (...args: TArgs) => void {
  let inThrottle = false;

  return (...args: TArgs) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
