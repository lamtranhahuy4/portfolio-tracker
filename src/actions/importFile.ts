'use server';

/**
 * Thin Server Action wrappers for file imports.
 * All orchestration logic lives in `src/services/ImportService.ts`.
 */
import { processImportFile, validateImportFile, ImportServiceResult } from '@/services/ImportService';
import { saveTransactionsBatch } from '@/actions/transaction';
import { saveCashEventsBatch } from '@/actions/cashLedger';
import type { ImportParseResult, ImportCashParseResult } from '@/types/portfolio';

// Re-export the DTO type so consumers don't need to import from two places
export type ImportFileResultDto =
  | {
      importKind: 'TRANSACTION';
      result: {
        transactions: Array<Omit<ImportParseResult['transactions'][number], 'date'> & { date: string }>;
        warnings: ImportParseResult['warnings'];
        summary: ImportParseResult['summary'];
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
          Omit<ImportCashParseResult['events'][number], 'date' | 'referenceTradeDate'> & {
            date: string;
            referenceTradeDate?: string;
          }
        >;
        summary: Omit<ImportCashParseResult['summary'], 'coverageStart' | 'coverageEnd'> & {
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

function serializePayload(payload: ImportServiceResult): ImportFileResultDto {
  if (payload.importKind === 'TRANSACTION') {
    return {
      importKind: 'TRANSACTION',
      result: {
        transactions: payload.result.transactions.map((tx) => ({ ...tx, date: new Date(tx.date).toISOString() })),
        warnings: payload.result.warnings,
        summary: payload.result.summary,
      },
      audit: { ...payload.audit, importedAt: payload.audit.importedAt.toISOString() },
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
    audit: { ...payload.audit, importedAt: payload.audit.importedAt.toISOString() },
  };
}

export async function importPortfolioFile(file: File, fileChecksum: string): Promise<ImportServiceResult> {
  validateImportFile(file, fileChecksum);
  return processImportFile(file, fileChecksum);
}

export async function importPortfolioFormData(formData: FormData): Promise<ImportServiceResult> {
  const file = formData.get('file');
  const fileChecksum = String(formData.get('fileChecksum') ?? '');
  validateImportFile(file, fileChecksum);
  return processImportFile(file as File, fileChecksum);
}

export async function importPortfolioFormDataDto(formData: FormData): Promise<ImportFileResultDto> {
  const payload = await importPortfolioFormData(formData);
  return serializePayload(payload);
}
