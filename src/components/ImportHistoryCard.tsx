'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { History, RotateCcw, ShieldAlert } from 'lucide-react';
import { rollbackImportBatchAction } from '@/actions/importBatch';
import { ImportBatchRecord } from '@/types/importAudit';

interface ImportHistoryCardProps {
  batches: ImportBatchRecord[];
  language: 'vi' | 'en';
}

const copy = {
  vi: {
    title: 'Lịch sử import',
    empty: 'Chưa có batch import nào.',
    rows: 'dòng',
    accepted: 'accepted',
    rejected: 'rejected',
    rollback: 'Rollback batch',
    rollingBack: 'Đang rollback...',
    success: 'Rollback batch thành công.',
    tx: 'Giao dịch',
    cash: 'Sổ tiền',
    rolledBack: 'Đã rollback',
    importedAt: 'Imported',
  },
  en: {
    title: 'Import History',
    empty: 'No import batches yet.',
    rows: 'rows',
    accepted: 'accepted',
    rejected: 'rejected',
    rollback: 'Rollback batch',
    rollingBack: 'Rolling back batch...',
    success: 'Batch rollback completed.',
    tx: 'Transactions',
    cash: 'Cash ledger',
    rolledBack: 'Rolled back',
    importedAt: 'Imported',
  },
} as const;

export default function ImportHistoryCard({ batches, language }: ImportHistoryCardProps) {
  const t = copy[language];
  const [pendingBatchId, setPendingBatchId] = useState<string | null>(null);

  const handleRollback = async (batchId: string) => {
    setPendingBatchId(batchId);
    try {
      await rollbackImportBatchAction(batchId);
      toast.success(t.success);
      window.location.reload();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setPendingBatchId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-400">
        <History className="h-4 w-4 text-cyan-400" />
        {t.title}
      </div>

      {batches.length === 0 ? (
        <span className="text-sm text-slate-500">{t.empty}</span>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => {
            const isRolledBack = batch.status === 'ROLLED_BACK';
            return (
              <div key={batch.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">
                        {batch.importKind === 'TRANSACTION' ? t.tx : t.cash}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.16em] ${
                        isRolledBack ? 'bg-amber-500/10 text-amber-300' : batch.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-orange-500/10 text-orange-300'
                      }`}>
                        {isRolledBack ? t.rolledBack : batch.status}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-white">{batch.fileName}</div>
                      <div className="mt-1 text-xs text-slate-500">{batch.source}</div>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                      <span>{t.importedAt}: {new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(batch.importedAt))}</span>
                      <span>{batch.totalRows} {t.rows}</span>
                      <span>{batch.acceptedRows} {t.accepted}</span>
                      <span>{batch.rejectedRows} {t.rejected}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isRolledBack ? (
                      <span className="inline-flex items-center gap-2 rounded-xl border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs font-semibold text-amber-200">
                        <ShieldAlert className="h-4 w-4" />
                        {t.rolledBack}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleRollback(batch.id)}
                        disabled={pendingBatchId === batch.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:bg-red-950/50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <RotateCcw className={`h-4 w-4 ${pendingBatchId === batch.id ? 'animate-spin' : ''}`} />
                        {pendingBatchId === batch.id ? t.rollingBack : t.rollback}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
