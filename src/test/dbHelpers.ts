import { vi } from 'vitest';

export interface MockDbEntry {
  id: string;
  [key: string]: unknown;
}

export interface MockDb {
  users: MockDbEntry[];
  transactions: MockDbEntry[];
  sessions: MockDbEntry[];
  marketPrices: MockDbEntry[];
}

export function createMockDb(): MockDb {
  return {
    users: [],
    transactions: [],
    sessions: [],
    marketPrices: [],
  };
}

export function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function createMockUser(overrides: Partial<MockDbEntry> = {}): MockDbEntry {
  return {
    id: generateId(),
    email: `test-${Date.now()}@example.com`,
    passwordHash: '$2a$10$test.hash',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockTransaction(overrides: Partial<MockDbEntry> = {}): MockDbEntry {
  return {
    id: generateId(),
    userId: generateId(),
    asset: 'HPG',
    assetClass: 'STOCK',
    type: 'BUY',
    amount: '1000.0000',
    price: '35000.000000',
    fee: '5000.0000',
    tax: '1500.0000',
    date: new Date().toISOString(),
    source: 'test',
    ...overrides,
  };
}

export function createMockSession(overrides: Partial<MockDbEntry> = {}): MockDbEntry {
  return {
    id: generateId(),
    userId: generateId(),
    tokenHash: 'abc123hash',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    ...overrides,
  };
}
