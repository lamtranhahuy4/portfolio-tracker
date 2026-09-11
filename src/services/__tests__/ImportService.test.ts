import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateImportFile, processImportFile } from '@/services/ImportService';
import { parseImportCashFile, parseImportFile } from '@/lib/importParser';
import { saveCashEventsBatch } from '@/actions/cashLedger';
import { saveTransactionsBatch } from '@/actions/transaction';
import { AppError } from '@/lib/errorHandler';

vi.mock('@/lib/importParser', () => ({
  parseImportCashFile: vi.fn(),
  parseImportFile: vi.fn(),
}));

vi.mock('@/actions/cashLedger', () => ({
  saveCashEventsBatch: vi.fn(),
}));

vi.mock('@/actions/transaction', () => ({
  saveTransactionsBatch: vi.fn(),
}));

describe('ImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateImportFile', () => {
    it('throws BAD_REQUEST if file is not a File instance', () => {
      expect(() => validateImportFile({}, 'checksum123')).toThrow(AppError);
      try {
        validateImportFile({}, 'checksum123');
      } catch (err: any) {
        expect(err.code).toBe('BAD_REQUEST');
        expect(err.statusCode).toBe(400);
      }
    });

    it('throws BAD_REQUEST if checksum is missing or empty', () => {
      const file = new File(['content'], 'test.csv');
      expect(() => validateImportFile(file, '')).toThrow(AppError);
      expect(() => validateImportFile(file, null)).toThrow(AppError);
      expect(() => validateImportFile(file, '   ')).toThrow(AppError);
    });

    it('does not throw if valid', () => {
      const file = new File(['content'], 'test.csv');
      expect(() => validateImportFile(file, 'checksum123')).not.toThrow();
    });
  });

  describe('processImportFile', () => {
    const checksum = 'checksum123';

    it('processes cash file correctly when filename indicates cash', async () => {
      const file = new File(['content'], 'tien_report.csv');
      
      const mockResult = {
        events: [{ id: 1 }],
        summary: { source: 'test-source', totalEvents: 1 }
      };
      const mockAudit = { id: 100 };

      vi.mocked(parseImportCashFile).mockResolvedValue(mockResult as any);
      vi.mocked(saveCashEventsBatch).mockResolvedValue(mockAudit as any);

      const res = await processImportFile(file, checksum);

      expect(parseImportCashFile).toHaveBeenCalledWith(file);
      expect(saveCashEventsBatch).toHaveBeenCalledWith(
        mockResult.events,
        expect.objectContaining({
          fileName: 'tien_report.csv',
          fileChecksum: checksum,
          source: 'test-source',
          importKind: 'CASH_LEDGER',
          totalRows: 1,
          acceptedRows: 1,
          rejectedRows: 0,
        })
      );

      expect(res).toEqual({
        importKind: 'CASH_LEDGER',
        result: mockResult,
        audit: mockAudit,
      });
      expect(parseImportFile).not.toHaveBeenCalled();
    });

    it('processes trade file correctly normally', async () => {
      const file = new File(['content'], 'trades.csv');
      
      const mockResult = {
        transactions: [{ id: 2 }],
        summary: { source: 'trade-source', totalRows: 1, acceptedRows: 1, rejectedRows: 0 }
      };
      const mockAudit = { id: 200 };

      vi.mocked(parseImportFile).mockResolvedValue(mockResult as any);
      vi.mocked(saveTransactionsBatch).mockResolvedValue(mockAudit as any);

      const res = await processImportFile(file, checksum);

      expect(parseImportFile).toHaveBeenCalledWith(file);
      expect(saveTransactionsBatch).toHaveBeenCalledWith(
        mockResult.transactions,
        expect.objectContaining({
          fileName: 'trades.csv',
          fileChecksum: checksum,
          source: 'trade-source',
          importKind: 'TRANSACTION',
          totalRows: 1,
          acceptedRows: 1,
          rejectedRows: 0,
        })
      );

      expect(res).toEqual({
        importKind: 'TRANSACTION',
        result: mockResult,
        audit: mockAudit,
      });
      expect(parseImportCashFile).not.toHaveBeenCalled();
    });

    it('retries as cash if excel file fails with missing header error', async () => {
      const file = new File(['content'], 'data.xlsx');
      
      const missingHeaderError = new Error('khong tim thay header');
      vi.mocked(parseImportFile).mockRejectedValue(missingHeaderError);

      const mockCashResult = {
        events: [{ id: 3 }],
        summary: { source: 'cash-source', totalEvents: 1 }
      };
      const mockCashAudit = { id: 300 };

      vi.mocked(parseImportCashFile).mockResolvedValue(mockCashResult as any);
      vi.mocked(saveCashEventsBatch).mockResolvedValue(mockCashAudit as any);

      const res = await processImportFile(file, checksum);

      expect(parseImportFile).toHaveBeenCalledWith(file);
      expect(parseImportCashFile).toHaveBeenCalledWith(file);
      expect(res).toEqual({
        importKind: 'CASH_LEDGER',
        result: mockCashResult,
        audit: mockCashAudit,
      });
    });

    it('throws error if trade file fails with other error', async () => {
      const file = new File(['content'], 'trades.csv');
      const otherError = new Error('some parsing error');
      vi.mocked(parseImportFile).mockRejectedValue(otherError);

      await expect(processImportFile(file, checksum)).rejects.toThrow('Đã xảy ra lỗi hệ thống');
    });

    it('throws error if cash file fails with other error', async () => {
      const file = new File(['content'], 'cash_report.csv');
      const otherError = new Error('some cash parsing error');
      vi.mocked(parseImportCashFile).mockRejectedValue(otherError);

      await expect(processImportFile(file, checksum)).rejects.toThrow('Đã xảy ra lỗi hệ thống');
    });
  });
});
