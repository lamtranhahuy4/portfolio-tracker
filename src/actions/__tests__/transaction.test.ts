import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveTransactionsBatch } from '../transaction';
import { db } from '@/db/index';
import { requireUser } from '@/lib/auth';
import { createImportBatch } from '@/actions/importBatch';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';

vi.mock('@/db/index', () => ({
  db: {
    transaction: vi.fn(async (cb) => {
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue([]), // existing.length = 0
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockReturnValue([{ id: 'batch-1', status: 'SUCCESS', importedAt: new Date() }]),
        onConflictDoNothing: vi.fn(),
      };
      return await cb(mockTx);
    }),
  }
}));

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn()
}));

vi.mock('@/actions/importBatch', () => ({
  createImportBatch: vi.fn()
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

describe('transaction actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saveTransactionsBatch should process data and call db.transaction', async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(createImportBatch).mockResolvedValue({ batchId: 'batch-1' } as any);

    const data: any[] = [
      {
        id: 'tx-1',
        assetClass: 'STOCK',
        ticker: 'VND',
        type: 'BUY',
        quantity: new Decimal(100),
        price: new Decimal(10),
        fee: new Decimal(1),
        tax: new Decimal(0),
        date: new Date('2026-09-01').getTime(),
        totalValue: new Decimal(1000)
      }
    ];

    const result = await saveTransactionsBatch(data as any);
    expect(result.batchId).toBe('batch-1');
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });

  it('saveTransactionsBatch should throw error if requireUser fails', async () => {
    vi.mocked(requireUser).mockRejectedValue(new Error('Unauthorized'));

    await expect(saveTransactionsBatch([])).rejects.toThrow('Đã xảy ra lỗi hệ thống');
  });
});
