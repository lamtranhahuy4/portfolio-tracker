'use client';

import React, { useRef, useState } from 'react';
import { parseCSVToTransactions } from '@/lib/csvMapper';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { saveTransactionsBatch } from '@/actions/transaction';
import { toast } from 'sonner';

export default function CsvUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const addTransactions = usePortfolioStore((state) => state.addTransactions);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Phân giải tệp CSV trên Client
      const transactions = await parseCSVToTransactions(file);
      
      if (transactions.length > 0) {
        // 2. Gửi tệp lên Backend via Server Actions (Postgres thông qua Drizzle)
        await saveTransactionsBatch(transactions);

        // 3. Nếu thành công, chèn liền vào Zustand UI để Instant Display
        addTransactions(transactions);
        toast.success(`Lưu DB thành công! Đã nạp ${transactions.length} dòng dữ liệu an toàn.`);
      } else {
        toast.warning('Cảnh báo: Không có giao dịch hợp lệ nào được tìm thấy trong file.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Lưu thất bại: ' + (error as Error).message);
    } finally {
      setIsUploading(false);
      // Xóa value đảm bảo input file chịu phản hồi upload lần sau
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <label className={`flex flex-col items-center justify-center flex-1 w-full cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
        isUploading ? 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700' : 'border-indigo-300 hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}>
        <div className="flex flex-col items-center justify-center gap-2">
          {isUploading ? (
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          ) : (
            <svg className="w-10 h-10 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
          )}
          <span className="text-gray-600 dark:text-gray-300 font-medium text-lg">
            {isUploading ? 'Đang gửi dữ liệu lưu trữ...' : 'Nhấn vào đây để Upload file báo cáo CSV'}
          </span>
          <span className="text-sm text-gray-500">Hỗ trợ các hệ bảng: Asset, Type, Quantity, Price...</span>
        </div>
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".csv" 
          className="hidden" 
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </label>
    </div>
  );
}
