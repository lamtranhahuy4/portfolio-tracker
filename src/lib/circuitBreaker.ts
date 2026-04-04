/**
 * Circuit Breaker pattern implementation for external API calls.
 * Prevents cascading failures by temporarily disabling failing services.
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
};

/**
 * Circuit Breaker for managing external service reliability.
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests are blocked
 * - HALF_OPEN: Testing if service recovered
 */
export class CircuitBreaker {
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number = 0;
  private state: CircuitState = 'CLOSED';
  private readonly config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getState(): CircuitState {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.config.timeout) {
        this.state = 'HALF_OPEN';
        this.successes = 0;
      }
    }
    return this.state;
  }

  isOpen(): boolean {
    return this.getState() === 'OPEN';
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === 'OPEN') {
      throw new Error(`Circuit breaker is OPEN. Service unavailable. Retry after ${this.getRetryAfter()}ms.`);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successes++;
      if (this.successes >= this.config.successThreshold) {
        this.reset();
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  private reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = 0;
  }

  private getRetryAfter(): number {
    const remaining = this.config.timeout - (Date.now() - this.lastFailureTime);
    return Math.max(0, remaining);
  }

  getStats(): {
    state: CircuitState;
    failures: number;
    successes: number;
    retryAfter: number;
  } {
    return {
      state: this.getState(),
      failures: this.failures,
      successes: this.successes,
      retryAfter: this.getRetryAfter(),
    };
  }

  /**
   * Manually reset the circuit breaker to CLOSED state.
   */
  forceReset(): void {
    this.reset();
  }
}

// Pre-configured circuit breakers for common services
export const quotesCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  successThreshold: 1,
  timeout: 60000, // 1 minute
});

export const marketDataCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 30000, // 30 seconds
});
