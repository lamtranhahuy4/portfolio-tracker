import { describe, expect, it, vi, beforeEach } from 'vitest';
import { vi as vitest } from 'vitest';
import {
  createMockUser,
  createMockTransaction,
  createMockSession,
  generateId,
  createMockDb,
} from '@/test/dbHelpers';

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vitest.fn(),
    error: vitest.fn(),
    warn: vitest.fn(),
    debug: vitest.fn(),
  },
}));

describe('Database Query Helpers', () => {
  describe('createMockDb', () => {
    it('should create a mock database with empty collections', () => {
      const db = createMockDb();

      expect(db).toHaveProperty('users');
      expect(db).toHaveProperty('transactions');
      expect(db).toHaveProperty('sessions');
      expect(db).toHaveProperty('marketPrices');
      expect(db.users).toHaveLength(0);
      expect(db.transactions).toHaveLength(0);
      expect(db.sessions).toHaveLength(0);
      expect(db.marketPrices).toHaveLength(0);
    });

    it('should allow adding entries to collections', () => {
      const db = createMockDb();
      const user = createMockUser();
      db.users.push(user);

      expect(db.users).toHaveLength(1);
      expect(db.users[0]).toEqual(user);
    });
  });

  describe('generateId', () => {
    it('should generate a valid UUID format', () => {
      const id = generateId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }
      expect(ids.size).toBe(100);
    });
  });

  describe('createMockUser', () => {
    it('should create a user with required fields', () => {
      const user = createMockUser();

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('passwordHash');
      expect(user).toHaveProperty('createdAt');
      expect(user.email).toMatch(/@example.com$/);
      expect(user.passwordHash).toBe('$2a$10$test.hash');
    });

    it('should allow overriding fields', () => {
      const customEmail = 'custom@example.com';
      const user = createMockUser({ email: customEmail });

      expect(user.email).toBe(customEmail);
    });

    it('should generate different IDs for different users', () => {
      const user1 = createMockUser();
      const user2 = createMockUser();

      expect(user1.id).not.toBe(user2.id);
    });
  });

  describe('createMockTransaction', () => {
    it('should create a transaction with required fields', () => {
      const transaction = createMockTransaction();

      expect(transaction).toHaveProperty('id');
      expect(transaction).toHaveProperty('userId');
      expect(transaction).toHaveProperty('asset');
      expect(transaction).toHaveProperty('assetClass');
      expect(transaction).toHaveProperty('type');
      expect(transaction).toHaveProperty('amount');
      expect(transaction).toHaveProperty('price');
      expect(transaction).toHaveProperty('fee');
      expect(transaction).toHaveProperty('tax');
      expect(transaction).toHaveProperty('date');
      expect(transaction).toHaveProperty('source');

      expect(transaction.asset).toBe('HPG');
      expect(transaction.assetClass).toBe('STOCK');
      expect(transaction.type).toBe('BUY');
    });

    it('should allow overriding fields', () => {
      const transaction = createMockTransaction({
        asset: 'FPT',
        type: 'SELL',
        amount: '500',
      });

      expect(transaction.asset).toBe('FPT');
      expect(transaction.type).toBe('SELL');
      expect(transaction.amount).toBe('500');
    });

    it('should use Decimal format for numeric fields', () => {
      const transaction = createMockTransaction();

      expect(transaction.amount).toMatch(/^\d+\.\d{4}$/);
      expect(transaction.price).toMatch(/^\d+\.\d{6}$/);
    });
  });

  describe('createMockSession', () => {
    it('should create a session with required fields', () => {
      const session = createMockSession();

      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('userId');
      expect(session).toHaveProperty('tokenHash');
      expect(session).toHaveProperty('expiresAt');
      expect(session).toHaveProperty('createdAt');
      expect(session).toHaveProperty('lastUsedAt');

      expect(session.tokenHash).toBe('abc123hash');
    });

    it('should set expiresAt to 30 days in the future by default', () => {
      const session = createMockSession();
      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

      const expiresAt = new Date(session.expiresAt as string).getTime();
      expect(expiresAt).toBeGreaterThan(now);
      expect(expiresAt - now).toBeCloseTo(thirtyDaysMs, -3);
    });

    it('should allow overriding fields', () => {
      const customTokenHash = 'custom-hash-value';
      const session = createMockSession({ tokenHash: customTokenHash });

      expect(session.tokenHash).toBe(customTokenHash);
    });
  });

  describe('Mock Data Relationships', () => {
    it('should support user-transaction relationship', () => {
      const user = createMockUser();
      const transaction = createMockTransaction({ userId: user.id });

      expect(transaction.userId).toBe(user.id);
    });

    it('should support user-session relationship', () => {
      const user = createMockUser();
      const session = createMockSession({ userId: user.id });

      expect(session.userId).toBe(user.id);
    });

    it('should allow querying user sessions', () => {
      const user = createMockUser();
      const db = createMockDb();

      db.users.push(user);
      db.sessions.push(
        createMockSession({ userId: user.id }),
        createMockSession({ userId: user.id }),
        createMockSession({ userId: generateId() })
      );

      const userSessions = db.sessions.filter((s) => s.userId === user.id);
      expect(userSessions).toHaveLength(2);
    });

    it('should allow querying user transactions', () => {
      const user = createMockUser();
      const db = createMockDb();

      db.users.push(user);
      db.transactions.push(
        createMockTransaction({ userId: user.id, asset: 'HPG' }),
        createMockTransaction({ userId: user.id, asset: 'FPT' }),
        createMockTransaction({ userId: generateId(), asset: 'VND' })
      );

      const userTransactions = db.transactions.filter((t) => t.userId === user.id);
      expect(userTransactions).toHaveLength(2);
    });
  });
});
