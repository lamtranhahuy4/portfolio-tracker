'use client';

import React, { useRef, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { saveTransactionsBatch } from '@/actions/transaction';
import { saveCashEventsBatch } from '@/actions/cashLedger';
import { parseImportCashFile, parseImportFile } from '@/lib/importParser';
import { DashboardLanguage } from '@/lib/dashboardLocale';
import { i18n } from '@/lib/i18n';
import { usePortfolioStore } from '@/store/usePortfolioStore';

export default function CsvUploader({ language }: { language: DashboardLanguage }) {
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
      const fileNameLower = file.name.toLowerCase();
      const isLikelyCashReport = fileNameLower.includes('tiền') || fileNameLower.includes('tien') || fileNameLower.includes('cash');

      if (isLikelyCashReport) {
        try {
          const result = await parseImportCashFile(file);
          if (result.events.length > 0) {
            await saveCashEventsBatch(result.events);
            addCashEvents(result.events);
            setLastCashImportSummary({ ...result.summary, importedAt: new Date() });
            toast.success(t.cashImportSuccess(result.events.length));
            if (result.summary.coverageStart && result.summary.coverageEnd) {
              toast.message(t.cashCoverage(result.summary.coverageStart, result.summary.coverageEnd));
            }
            if (result.summary.unclassifiedEvents > 0) {
              toast.warning(t.unclassifiedCash(result.summary.unclassifiedEvents));
            }
          } else {
            toast.warning(t.invalidCashFile);
          }
        } catch (err: any) {
          if (err.message?.includes(t.missingHeader)) {
            await handleTradeFile(file);
          } else {
            throw err;
          }
        }
      } else {
        await handleTradeFile(file);
      }
    } catch (error) {
      toast.error(t.parseError + (error as Error).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleTradeFile = async (file: File) => {
    const result = await parseImportFile(file);
    setLastImportResult({ ...result, importedAt: new Date() });

    if (result.transactions.length > 0) {
      await saveTransactionsBatch(result.transactions);
      addTransactions(result.transactions);
      toast.success(t.tradeImportSuccess(result.transactions.length));

      if (result.warnings.length > 0) {
        toast.warning(t.skippedRows(result.warnings.length));
      }
    } else if (result.warnings.length > 0) {
      toast.warning(result.warnings[0].message);
    } else {
      toast.warning(t.invalidFile);
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
