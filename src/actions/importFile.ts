'use server';

import { parseImportCashFile, parseImportFile } from '@/lib/importParser';
import { saveCashEventsBatch } from '@/actions/cashLedger';
import { saveTransactionsBatch } from '@/actions/transaction';
import { ImportBatchInput } from '@/types/importAudit';

type ImportFileResult =
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

function isMissingHeaderError(error: unknown) {
  return error instanceof Error && error.message.toLowerCase().includes('khong tim thay header'.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
}

export async function importPortfolioFile(file: File, fileChecksum: string): Promise<ImportFileResult> {
  if (!(file instanceof File)) {
    throw new Error('File upload không hợp lệ.');
  }
  if (!fileChecksum) {
    throw new Error('Thiếu checksum của file import.');
  }

  return importPortfolioFileInternal(file, fileChecksum);
}

async function importPortfolioFileInternal(file: File, fileChecksum: string): Promise<ImportFileResult> {
  const fileNameLower = file.name.toLowerCase();
  const isExcelFile = fileNameLower.endsWith('.xlsx') || fileNameLower.endsWith('.xls');
  const isLikelyCashReport = fileNameLower.includes('tiền') || fileNameLower.includes('tien') || fileNameLower.includes('cash');

  const buildImportInput = (source: string, importKind: ImportBatchInput['importKind'], totalRows: number, acceptedRows: number, rejectedRows: number): ImportBatchInput => ({
    fileName: file.name,
    fileChecksum,
    source,
    importKind,
    totalRows,
    acceptedRows,
    rejectedRows,
  });

  if (isLikelyCashReport) {
    try {
      const result = await parseImportCashFile(file);
      const audit = await saveCashEventsBatch(
        result.events,
        buildImportInput(result.summary.source, 'CASH_LEDGER', result.summary.totalEvents, result.events.length, 0)
      );
      return { importKind: 'CASH_LEDGER', result, audit };
    } catch (error) {
      if (!isMissingHeaderError(error)) {
        throw error;
      }
    }
  }

  try {
    const result = await parseImportFile(file);
    const audit = await saveTransactionsBatch(
      result.transactions,
      buildImportInput(
        result.summary.source,
        'TRANSACTION',
        result.summary.totalRows,
        result.summary.acceptedRows,
        result.summary.rejectedRows
      )
    );
    return { importKind: 'TRANSACTION', result, audit };
  } catch (error) {
    if (!isExcelFile || isLikelyCashReport || !isMissingHeaderError(error)) {
      throw error;
    }
  }

  const cashResult = await parseImportCashFile(file);
  const cashAudit = await saveCashEventsBatch(
    cashResult.events,
    buildImportInput(cashResult.summary.source, 'CASH_LEDGER', cashResult.summary.totalEvents, cashResult.events.length, 0)
  );
  return { importKind: 'CASH_LEDGER', result: cashResult, audit: cashAudit };
}

export async function importPortfolioFormData(formData: FormData): Promise<ImportFileResult> {
  const file = formData.get('file');
  const fileChecksum = String(formData.get('fileChecksum') ?? '');

  if (!(file instanceof File)) {
    throw new Error('File upload không hợp lệ.');
  }

  return importPortfolioFileInternal(file, fileChecksum);
}
