/**
 * ImportService — Business logic layer for portfolio file imports.
 *
 * This service decouples the parsing + persistence orchestration from the
 * Server Action thin wrappers in `actions/importFile.ts`. By extracting the
 * logic here, it becomes independently testable and reusable without needing
 * the Next.js Server Action context.
 *
 * The `actions/importFile.ts` file should call these functions directly.
 */
import { parseImportCashFile, parseImportFile } from '@/lib/importParser';
import { saveCashEventsBatch } from '@/actions/cashLedger';
import { saveTransactionsBatch } from '@/actions/transaction';
import { withErrorHandler, AppError } from '@/lib/errorHandler';
import { ImportBatchInput } from '@/types/importAudit';

// ─── Internal Helpers ────────────────────────────────────────────────────────

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isMissingHeaderError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return normalizeName(error.message).includes('khong tim thay header');
}

function buildImportInput(
  file: File,
  fileChecksum: string,
  source: string,
  importKind: ImportBatchInput['importKind'],
  totalRows: number,
  acceptedRows: number,
  rejectedRows: number
): ImportBatchInput {
  return {
    fileName: file.name,
    fileChecksum,
    source,
    importKind,
    totalRows,
    acceptedRows,
    rejectedRows,
  };
}

// ─── Public Result Types ─────────────────────────────────────────────────────

export type ImportServiceResult =
  | {
      importKind: 'TRANSACTION';
      result: Awaited<ReturnType<typeof parseImportFile>>;
      audit: Awaited<ReturnType<typeof saveTransactionsBatch>>;
    }
  | {
      importKind: 'CASH_LEDGER';
      result: Awaited<ReturnType<typeof parseImportCashFile>>;
      audit: Awaited<ReturnType<typeof saveCashEventsBatch>>;
    };

// ─── Service Functions ───────────────────────────────────────────────────────

/**
 * Validates a file before attempting to parse it. Throws `AppError` with
 * `BAD_REQUEST` code for invalid inputs so callers can distinguish client
 * errors from internal failures.
 */
export function validateImportFile(file: unknown, fileChecksum: unknown): asserts file is File {
  if (!(file instanceof File)) {
    throw new AppError('File upload không hợp lệ.', 'BAD_REQUEST', 400);
  }
  if (!fileChecksum || typeof fileChecksum !== 'string' || !fileChecksum.trim()) {
    throw new AppError('Thiếu checksum của file import.', 'BAD_REQUEST', 400);
  }
}

/**
 * Core orchestration: determine file type (trade vs. cash), parse accordingly,
 * then persist the results via the data-access layer.
 *
 * Auto-detection order:
 * 1. If filename contains "tien" / "cash" → try cash parser first.
 * 2. Otherwise try trade parser.
 * 3. For Excel files: if trade parser fail with header-not-found, retry as cash.
 */
export const processImportFile = withErrorHandler(async function processImportFile(
  file: File,
  fileChecksum: string
): Promise<ImportServiceResult> {
  const fileNameNormalized = normalizeName(file.name);
  const isExcelFile = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
  const isLikelyCashReport = fileNameNormalized.includes('tien') || fileNameNormalized.includes('cash');

  if (isLikelyCashReport) {
    try {
      const result = await parseImportCashFile(file);
      const audit = await saveCashEventsBatch(
        result.events,
        buildImportInput(file, fileChecksum, result.summary.source, 'CASH_LEDGER', result.summary.totalEvents, result.events.length, 0)
      );
      return { importKind: 'CASH_LEDGER', result, audit };
    } catch (error) {
      if (!isMissingHeaderError(error)) throw error;
    }
  }

  try {
    const result = await parseImportFile(file);
    const audit = await saveTransactionsBatch(
      result.transactions,
      buildImportInput(
        file, fileChecksum, result.summary.source, 'TRANSACTION',
        result.summary.totalRows, result.summary.acceptedRows, result.summary.rejectedRows
      )
    );
    return { importKind: 'TRANSACTION', result, audit };
  } catch (error) {
    if (!isExcelFile || !isMissingHeaderError(error)) throw error;
  }

  // Last resort: Excel file where trade header was not found → treat as cash ledger
  const cashResult = await parseImportCashFile(file);
  const cashAudit = await saveCashEventsBatch(
    cashResult.events,
    buildImportInput(file, fileChecksum, cashResult.summary.source, 'CASH_LEDGER', cashResult.summary.totalEvents, cashResult.events.length, 0)
  );
  return { importKind: 'CASH_LEDGER', result: cashResult, audit: cashAudit };
});
