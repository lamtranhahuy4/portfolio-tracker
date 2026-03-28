'use client';

import React, { useRef, useState } from 'react';
import { parseFileToTransactions } from '@/lib/csvMapper';
import { parseExcelToTransactions } from '@/lib/excelMapper';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { saveTransactionsBatch } from '@/actions/transaction';
import { toast } from 'sonner';
import { FileSpreadsheet } from 'lucide-react';

export default function CsvUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const addTransactions = usePortfolioStore((state) => state.addTransactions);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let transactions: any[] = [];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') {
        transactions = await parseExcelToTransactions(file);
      } else {
        transactions = await parseFileToTransactions(file);
      }
      
      if (transactions.length > 0) {
        await saveTransactionsBatch(transactions);
        addTransactions(transactions);
        toast.success(`Nạp thành công ${transactions.length} giao dịch.`);
      } else {
        toast.warning('File không hợp lệ hoặc dữ liệu trống.');
      }
    } catch (error) {
      toast.error('Lỗi phân tích: ' + (error as Error).message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
