export type ImportBatchKind = 'TRANSACTION' | 'CASH_LEDGER';

export type ImportBatchStatus = 'SUCCESS' | 'PARTIAL' | 'ROLLED_BACK';

export interface ImportBatchInput {
  fileName: string;
  fileChecksum: string;
  source: string;
  importKind: ImportBatchKind;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
}

export interface ImportBatchRecord extends ImportBatchInput {
  id: string;
  status: ImportBatchStatus;
  importedAt: Date;
  rolledBackAt?: Date | null;
}

export interface TradeImportAuditResult {
  batchId: string;
  status: ImportBatchStatus;
  importedAt: Date;
}

export type CashImportAuditResult = TradeImportAuditResult;
