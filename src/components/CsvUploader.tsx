'use client';

import React, { useRef, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { saveTransactionsBatch } from '@/actions/transaction';
import { saveCashEventsBatch } from '@/actions/cashLedger';
import { parseImportCashFile, parseImportFile } from '@/lib/importParser';
import { usePortfolioStore } from '@/store/usePortfolioStore';

export default function CsvUploader() {
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
            toast.success(`Nạp thành công ${result.events.length} sự kiện dòng tiền.`);
            if (result.summary.coverageStart && result.summary.coverageEnd) {
              toast.message(
                `Coverage ${new Intl.DateTimeFormat('vi-VN').format(result.summary.coverageStart)} - ${new Intl.DateTimeFormat('vi-VN').format(result.summary.coverageEnd)}`
              );
            }
            if (result.summary.unclassifiedEvents > 0) {
              toast.warning(`Có ${result.summary.unclassifiedEvents} sự kiện chưa được phân loại rõ ràng.`);
            }
          } else {
            toast.warning('File dòng tiền không hợp lệ hoặc dữ liệu trống.');
          }
        } catch (err: any) {
          if (err.message?.includes('Không tìm thấy header')) {
            await handleTradeFile(file);
          } else {
            throw err;
          }
        }
      } else {
        await handleTradeFile(file);
      }
    } catch (error) {
      toast.error('Lỗi phân tích: ' + (error as Error).message);
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
      toast.success(`Nạp thành công ${result.transactions.length} giao dịch.`);

      if (result.warnings.length > 0) {
        toast.warning(`${result.warnings.length} dòng bị bỏ qua. Kiểm tra lại file import.`);
      }
    } else if (result.warnings.length > 0) {
      toast.warning(result.warnings[0].message);
    } else {
      toast.warning('File không hợp lệ hoặc dữ liệu trống.');
    }
  };

  return (
    <div className="w-full h-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 flex flex-col justify-center items-center transition-all hover:shadow-md h-[100%] min-h-[160px]">
      <div className="flex flex-col items-center justify-center w-full h-full">
        <label className={`flex flex-col items-center justify-center w-full h-full cursor-pointer rounded-xl border-2 border-dashed transition-all ${
          isUploading ? 'bg-indigo-50/50 dark:bg-gray-800 border-indigo-200' : 'border-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/10'
        }`}>
          {isUploading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mb-2 mt-4"></div>
          ) : (
            <FileSpreadsheet className="w-6 h-6 text-indigo-500 mb-2 mt-4" />
          )}
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 text-center uppercase tracking-wide">
            {isUploading ? 'Đang đọc...' : 'Tải lên Dữ liệu'}
          </span>
          <span className="text-[10px] text-gray-400 mt-1 mb-4">.CSV, .XLSX, .XLS</span>
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

