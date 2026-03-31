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

export type ImportFileResultDto =
  | {
      importKind: 'TRANSACTION';
      result: {
        transactions: Array<Omit<Awaited<ReturnType<typeof parseImportFile>>['transactions'][number], 'date'> & { date: string }>;
        warnings: Awaited<ReturnType<typeof parseImportFile>>['warnings'];
        summary: Awaited<ReturnType<typeof parseImportFile>>['summary'];
      };
      audit: {
        batchId: string;
        status: Awaited<ReturnType<typeof saveTransactionsBatch>>['status'];
        importedAt: string;
      };
    }
  | {
      importKind: 'CASH_LEDGER';
      result: {
        events: Array<
          Omit<Awaited<ReturnType<typeof parseImportCashFile>>['events'][number], 'date' | 'referenceTradeDate'> & {
            date: string;
            referenceTradeDate?: string;
          }
        >;
        summary: Omit<Awaited<ReturnType<typeof parseImportCashFile>>['summary'], 'coverageStart' | 'coverageEnd'> & {
          coverageStart?: string;
          coverageEnd?: string;
        };
      };
      audit: {
        batchId: string;
        status: Awaited<ReturnType<typeof saveCashEventsBatch>>['status'];
        importedAt: string;
      };
    };

function isMissingHeaderError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const normalizedMessage = error.message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  return normalizedMessage.includes('khong tim thay header');
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
  const normalizedFileName = fileNameLower
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const isLikelyCashReport = normalizedFileName.includes('tien') || normalizedFileName.includes('cash');

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
    if (!isExcelFile || !isMissingHeaderError(error)) {
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

export async function importPortfolioFormDataDto(formData: FormData): Promise<ImportFileResultDto> {
  const payload = await importPortfolioFormData(formData);

  if (payload.importKind === 'TRANSACTION') {
    return {
      importKind: 'TRANSACTION',
      result: {
        transactions: payload.result.transactions.map((tx) => ({
          ...tx,
          date: new Date(tx.date).toISOString(),
        })),
        warnings: payload.result.warnings,
        summary: payload.result.summary,
      },
      audit: {
        ...payload.audit,
        importedAt: payload.audit.importedAt.toISOString(),
      },
    };
  }

  return {
    importKind: 'CASH_LEDGER',
    result: {
      events: payload.result.events.map((evt) => ({
        ...evt,
        date: new Date(evt.date).toISOString(),
        referenceTradeDate: evt.referenceTradeDate ? new Date(evt.referenceTradeDate).toISOString() : undefined,
      })),
      summary: {
        ...payload.result.summary,
        coverageStart: payload.result.summary.coverageStart ? new Date(payload.result.summary.coverageStart).toISOString() : undefined,
        coverageEnd: payload.result.summary.coverageEnd ? new Date(payload.result.summary.coverageEnd).toISOString() : undefined,
      },
    },
    audit: {
      ...payload.audit,
      importedAt: payload.audit.importedAt.toISOString(),
    },
  };
}
