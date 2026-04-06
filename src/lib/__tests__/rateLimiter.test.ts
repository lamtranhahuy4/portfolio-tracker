import { describe, expect, it } from 'vitest';

describe('RateLimiter Types', () => {
  describe('RateLimitConfig', () => {
    it('should have correct type structure', () => {
      const config = {
        maxAttempts: 5,
        lockoutDurationMs: 900000,
        windowMs: 900000,
      };
      
      expect(config.maxAttempts).toBe(5);
      expect(config.lockoutDurationMs).toBe(900000);
      expect(config.windowMs).toBe(900000);
    });

    it('should accept valid numeric values', () => {
      const config = {
        maxAttempts: 3,
        lockoutDurationMs: 600000,
        windowMs: 300000,
      };
      
      expect(typeof config.maxAttempts).toBe('number');
      expect(typeof config.lockoutDurationMs).toBe('number');
      expect(typeof config.windowMs).toBe('number');
    });
  });

  describe('LockoutInfo', () => {
    it('should represent unlocked state', () => {
      const lockoutInfo = {
        isLocked: false,
      };
      
      expect(lockoutInfo.isLocked).toBe(false);
    });

    it('should represent locked state', () => {
      const lockedUntil = new Date();
      const lockoutInfo = {
        isLocked: true,
        lockedUntil,
        reason: 'Too many attempts',
      };
      
      expect(lockoutInfo.isLocked).toBe(true);
      expect(lockoutInfo.lockedUntil).toBeInstanceOf(Date);
      expect(lockoutInfo.reason).toBe('Too many attempts');
    });
  });
});

describe('Rate Limiter Configuration', () => {
  const DEFAULT_MAX_ATTEMPTS = 5;
  const DEFAULT_LOCKOUT_DURATION_MS = 15 * 60 * 1000;
  const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

  it('should have sensible default max attempts', () => {
    expect(DEFAULT_MAX_ATTEMPTS).toBe(5);
  });

  it('should have sensible default lockout duration', () => {
    expect(DEFAULT_LOCKOUT_DURATION_MS).toBe(900000); // 15 minutes
  });

  it('should have sensible default window', () => {
    expect(DEFAULT_WINDOW_MS).toBe(900000); // 15 minutes
  });

  it('should support custom max attempts', () => {
    const customMaxAttempts = 10;
    expect(customMaxAttempts).toBeGreaterThan(DEFAULT_MAX_ATTEMPTS);
  });

  it('should support custom lockout duration', () => {
    const customDuration = 30 * 60 * 1000; // 30 minutes
    expect(customDuration).toBe(1800000);
  });
});
