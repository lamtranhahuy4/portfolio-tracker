import { describe, expect, it } from 'vitest';
import { deriveImportBatchStatus } from '@/lib/importBatches';

describe('import batch status', () => {
  it('marks fully accepted imports as success', () => {
    expect(deriveImportBatchStatus({ acceptedRows: 10, rejectedRows: 0 })).toBe('SUCCESS');
  });

  it('marks mixed imports as partial', () => {
    expect(deriveImportBatchStatus({ acceptedRows: 7, rejectedRows: 3 })).toBe('PARTIAL');
  });

  it('marks fully rejected imports as partial', () => {
    expect(deriveImportBatchStatus({ acceptedRows: 0, rejectedRows: 5 })).toBe('PARTIAL');
  });
});
