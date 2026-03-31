'use client';

import React, { useRef, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { importPortfolioFormDataDto } from '@/actions/importFile';
import { DashboardLanguage } from '@/lib/dashboardLocale';
import { i18n } from '@/lib/i18n';
import { usePortfolioStore } from '@/store/usePortfolioStore';

async function computeFileChecksum(file: File) {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export default function CsvUploaderServerImport({ language }: { language: DashboardLanguage }) {
  const t = i18n[language].csvUploader;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const addTransactions = usePortfolioStore((state) => state.addTransactions);
  const addCashEvents = usePortfolioStore((state) => state.addCashEvents);
  const setLastImportResult = usePortfolioStore((state) => state.setLastImportResult);
  const setLastCashImportSummary = usePortfolioStore((state) => state.setLastCashImportSummary);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileChecksum = await computeFileChecksum(file);
      const formData = new FormData();
      formData.set('file', file);
      formData.set('fileChecksum', fileChecksum);

      const payload = await importPortfolioFormDataDto(formData);

      if (payload.importKind === 'TRANSACTION') {
        const { result, audit } = payload;
        const transactions = result.transactions.map((tx) => ({
          ...tx,
          date: new Date(tx.date),
        }));
        const importedAt = new Date(audit.importedAt);

        setLastImportResult({
          ...result,
          transactions,
          summary: {
            ...result.summary,
            batchId: audit.batchId,
            status: audit.status,
            importedAt,
          },
          importedAt,
        });

        if (transactions.length > 0) {
          addTransactions(transactions);
          toast.success(t.tradeImportSuccess(transactions.length));
          if (result.warnings.length > 0) {
            toast.warning(t.skippedRows(result.warnings.length));
          }
        } else if (result.warnings.length > 0) {
          toast.warning(result.warnings[0].message);
        } else {
          toast.warning(t.invalidFile);
        }
      } else {
        const { result, audit } = payload;
        const events = result.events.map((evt) => ({
          ...evt,
          date: new Date(evt.date),
          referenceTradeDate: evt.referenceTradeDate ? new Date(evt.referenceTradeDate) : undefined,
        }));
        const importedAt = new Date(audit.importedAt);
        const coverageStart = result.summary.coverageStart ? new Date(result.summary.coverageStart) : undefined;
        const coverageEnd = result.summary.coverageEnd ? new Date(result.summary.coverageEnd) : undefined;

        setLastCashImportSummary({
          ...result.summary,
          coverageStart,
          coverageEnd,
          batchId: audit.batchId,
          status: audit.status,
          importedAt,
        });

        if (events.length > 0) {
          addCashEvents(events);
          toast.success(t.cashImportSuccess(events.length));
          if (coverageStart && coverageEnd) {
            toast.message(t.cashCoverage(coverageStart, coverageEnd));
          }
          if (result.summary.unclassifiedEvents > 0) {
            toast.warning(t.unclassifiedCash(result.summary.unclassifiedEvents));
          }
        } else {
          toast.warning(t.invalidCashFile);
        }
      }
    } catch (error) {
      toast.error(t.parseError + (error as Error).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex h-full min-h-[220px] w-full flex-col items-center justify-center rounded-[24px] border border-slate-800 bg-slate-900/60 p-4 shadow-xl shadow-black/20 backdrop-blur-sm transition-all">
      <div className="flex h-full w-full flex-col items-center justify-center">
        <label className={`flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed transition-all ${
          isUploading ? 'border-blue-500/40 bg-slate-950/80' : 'border-slate-800 bg-slate-900/60 hover:bg-slate-900/80'
        }`}>
          {isUploading ? (
            <div className="mb-3 mt-4 h-6 w-6 animate-spin rounded-full border-b-2 border-blue-400"></div>
          ) : (
            <FileSpreadsheet className="mb-3 mt-4 h-7 w-7 text-blue-400" />
          )}
          <span className="text-center text-xs font-bold uppercase tracking-[0.24em] text-slate-300">
            {isUploading ? t.reading : t.upload}
          </span>
          <span className="mb-1 mt-2 text-[10px] text-slate-500">.CSV, .XLSX, .XLS</span>
          <span className="mb-4 max-w-[220px] text-center text-xs text-slate-400">{t.helper}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .xlsx, .xls"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      </div>
    </div>
  );
}
