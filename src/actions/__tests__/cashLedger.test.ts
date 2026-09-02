import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveCashEventsBatch } from '../cashLedger';
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

describe('cashLedger actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saveCashEventsBatch should process data and call db.transaction', async () => {
    vi.mocked(requireUser).mockResolvedValue({ id: 'user-1' } as any);
    vi.mocked(createImportBatch).mockResolvedValue({ batchId: 'batch-1' } as any);

    const data: any[] = [
      {
        id: 'evt-1',
        date: new Date('2026-09-01').getTime(),
        direction: 'INFLOW',
        eventType: 'DEPOSIT',
        amount: new Decimal(1000),
        balanceAfter: new Decimal(1000),
        notes: 'Initial deposit',
        description: 'Deposit',
        source: 'manual'
      }
    ];

    const result = await saveCashEventsBatch(data as any);
    expect(result.batchId).toBe('batch-1');
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(revalidatePath).toHaveBeenCalledWith('/');
  });

  it('saveCashEventsBatch should throw error if requireUser fails', async () => {
    vi.mocked(requireUser).mockRejectedValue(new Error('Unauthorized'));

    await expect(saveCashEventsBatch([])).rejects.toThrow('Đã xảy ra lỗi hệ thống');
  });
});
