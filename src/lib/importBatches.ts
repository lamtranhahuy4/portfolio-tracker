import { ImportBatchInput, ImportBatchStatus } from '@/types/importAudit';

export function deriveImportBatchStatus(input: Pick<ImportBatchInput, 'acceptedRows' | 'rejectedRows'>): ImportBatchStatus {
  if (input.acceptedRows > 0 && input.rejectedRows === 0) {
    return 'SUCCESS';
  }

  if (input.acceptedRows > 0 || input.rejectedRows > 0) {
    return 'PARTIAL';
  }

  return 'SUCCESS';
}
