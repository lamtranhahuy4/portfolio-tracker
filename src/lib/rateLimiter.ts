/**
 * Rate Limiter for Authentication
 * Provides brute-force protection by tracking failed login attempts
 * and temporarily locking accounts/IPs after too many failures.
 */

import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/db/index';
import { accountLockouts, loginAttempts } from '@/db/schema';

export interface RateLimitConfig {
  maxAttempts: number;
  lockoutDurationMs: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
  windowMs: 15 * 60 * 1000, // 15 minutes
};

export interface LockoutInfo {
  isLocked: boolean;
  lockedUntil?: Date;
  reason?: string;
}

export class AuthRateLimiter {
  private readonly config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async isEmailLocked(email: string): Promise<LockoutInfo> {
    const now = new Date();

    const [lockout] = await db
      .select()
      .from(accountLockouts)
      .where(
        and(
          eq(accountLockouts.email, email.toLowerCase()),
          gt(accountLockouts.lockedUntil, now)
        )
      )
      .limit(1);

    if (lockout) {
      return {
        isLocked: true,
        lockedUntil: new Date(lockout.lockedUntil),
        reason: lockout.reason ?? undefined,
      };
    }

    return { isLocked: false };
  }

  async isIpLocked(ipAddress: string): Promise<LockoutInfo> {
    const now = new Date();

    const [lockout] = await db
      .select()
      .from(accountLockouts)
      .where(
        and(
          eq(accountLockouts.ipAddress, ipAddress),
          gt(accountLockouts.lockedUntil, now)
        )
      )
      .limit(1);

    if (lockout) {
      return {
        isLocked: true,
        lockedUntil: new Date(lockout.lockedUntil),
        reason: lockout.reason ?? undefined,
      };
    }

    return { isLocked: false };
  }

  async isLocked(email: string, ipAddress: string): Promise<LockoutInfo> {
    const emailLockout = await this.isEmailLocked(email);
    if (emailLockout.isLocked) {
      return emailLockout;
    }

    return this.isIpLocked(ipAddress);
  }

  async getFailedAttempts(email: string): Promise<number> {
    const windowStart = new Date(Date.now() - this.config.windowMs);

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.email, email.toLowerCase()),
          eq(loginAttempts.success, '0'),
          gt(loginAttempts.attemptedAt, windowStart)
        )
      );

    return Number(result[0]?.count ?? 0);
  }

  async getIpFailedAttempts(ipAddress: string): Promise<number> {
    const windowStart = new Date(Date.now() - this.config.windowMs);

    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(loginAttempts)
      .where(
        and(
          eq(loginAttempts.ipAddress, ipAddress),
          eq(loginAttempts.success, '0'),
          gt(loginAttempts.attemptedAt, windowStart)
        )
      );

    return Number(result[0]?.count ?? 0);
  }

  async recordAttempt(
    email: string,
    success: boolean,
    ipAddress?: string
  ): Promise<void> {
    await db.insert(loginAttempts).values({
      email: email.toLowerCase(),
      ipAddress: ipAddress ?? null,
      success: success ? '1' : '0',
      attemptedAt: new Date(),
    });
  }

  async lockEmail(email: string, reason: string): Promise<void> {
    const lockedUntil = new Date(Date.now() + this.config.lockoutDurationMs);

    await db.insert(accountLockouts).values({
      email: email.toLowerCase(),
      lockedUntil,
      reason,
    });
  }

  async lockIp(ipAddress: string, reason: string): Promise<void> {
    const lockedUntil = new Date(Date.now() + this.config.lockoutDurationMs);

    await db.insert(accountLockouts).values({
      ipAddress,
      lockedUntil,
      reason,
    });
  }

  async lockBoth(
    email: string,
    ipAddress: string,
    reason: string
  ): Promise<void> {
    await Promise.all([
      this.lockEmail(email, reason),
      this.lockIp(ipAddress, reason),
    ]);
  }

  async checkAndLock(
    email: string,
    ipAddress: string
  ): Promise<{ locked: boolean; attempts: number; maxAttempts: number }> {
    const emailAttempts = await this.getFailedAttempts(email);
    const ipAttempts = await this.getIpFailedAttempts(ipAddress);
    const totalAttempts = emailAttempts + ipAttempts;

    if (totalAttempts >= this.config.maxAttempts) {
      const reason = `Too many failed login attempts (${totalAttempts})`;
      await this.lockBoth(email, ipAddress, reason);
      return { locked: true, attempts: totalAttempts, maxAttempts: this.config.maxAttempts };
    }

    return { locked: false, attempts: totalAttempts, maxAttempts: this.config.maxAttempts };
  }

  async cleanupExpiredLockouts(): Promise<number> {
    const now = new Date();

    const result = await db
      .delete(accountLockouts)
      .where(sql`${accountLockouts.lockedUntil} < ${now}`);

    return result.rowCount ?? 0;
  }

  async cleanupOldAttempts(): Promise<number> {
    const cutoff = new Date(Date.now() - this.config.windowMs * 2);

    const result = await db
      .delete(loginAttempts)
      .where(sql`${loginAttempts.attemptedAt} < ${cutoff}`);

    return result.rowCount ?? 0;
  }

  async getRemainingLockoutTime(email: string): Promise<number> {
    const lockout = await this.isEmailLocked(email);
    if (!lockout.isLocked || !lockout.lockedUntil) {
      return 0;
    }

    const remaining = lockout.lockedUntil.getTime() - Date.now();
    return Math.max(0, remaining);
  }
}

// Singleton instance for use throughout the app
export const authRateLimiter = new AuthRateLimiter();
