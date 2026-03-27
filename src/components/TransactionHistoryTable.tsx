'use client';

import React, { useState, useMemo } from 'react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { Transaction } from '@/types/portfolio';
import { ArrowDown, ArrowUp, ArrowUpDown, History } from 'lucide-react';

type SortKey = keyof Transaction;

export default function TransactionHistoryTable() {
  const transactions = usePortfolioStore((state) => state.transactions);

  // Mặc định sort theo ngày giảm dần (mới nhất lên trên)
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({
    key: 'date',
    direction: 'desc',
  });

  // State cho phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 1. Logic Sorting
  const sortedTransactions = useMemo(() => {
    const sortableItems = [...transactions];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Ép kiểu Date sang int để sort chính xác
        if (aValue instanceof Date) aValue = aValue.getTime();
        if (bValue instanceof Date) bValue = bValue.getTime();

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [transactions, sortConfig]);

  // 2. Logic Pagination
  const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
  // Reset currentPage nếu bị kẹt ngoài range khi data thay đổi
  const safeCurrentPage = Math.min(currentPage, totalPages > 0 ? totalPages : 1);
  
  const currentItems = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * itemsPerPage;
    return sortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedTransactions, safeCurrentPage, itemsPerPage]);

  // Hàm trigger đổi chế độ sort
  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'desc'; // ưu tiên nhấn vào thì đảo desc
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    } else if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Helper render Icon Sort
  const getSortIcon = (columnKey: SortKey) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 opacity-40 block" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 block" /> 
      : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 block" />;
  };

  // 3. Formatters
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(val);
  const formatDate = (date: Date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // --- EMPTY STATE UI ---
  if (transactions.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center shadow-sm relative overflow-hidden">
        {/* Nền chìm Decorative */}
        <div className="absolute inset-0 bg-gray-50/50 dark:bg-gray-800/20 max-w-full"></div>
        <div className="flex flex-col items-center justify-center gap-4 relative z-10">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-400 dark:text-gray-500 shadow-inner">
            <History className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Chưa có dữ liệu giao dịch</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 max-w-sm mx-auto">Vui lòng tải lên file CSV ở phía trên để hệ thống nạp dữ liệu và bắt đầu thống kê danh mục đầu tư của bạn.</p>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDERING TABLE ---
  return (
    <div className="w-full flex flex-col">
      <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        
        {/* VÙNG BẢNG (Kéo ngang trên Mobile) */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 font-semibold border-b border-gray-200 dark:border-gray-700 select-none">
              <tr>
                <th 
                  className="px-5 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => requestSort('date')}
                >
                  <div className="flex items-center gap-2">Thời gian {getSortIcon('date')}</div>
                </th>
                <th 
                  className="px-5 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => requestSort('ticker')}
                >
                  <div className="flex items-center gap-2">Tài sản (Asset) {getSortIcon('ticker')}</div>
                </th>
                <th 
                  className="px-5 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => requestSort('type')}
                >
                  <div className="flex items-center gap-2">Loại (Type) {getSortIcon('type')}</div>
                </th>
                <th 
                  className="px-5 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => requestSort('quantity')}
                >
                  <div className="flex items-center justify-end gap-2 w-full">Số lượng (Amount) {getSortIcon('quantity')}</div>
                </th>
                <th 
                  className="px-5 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => requestSort('price')}
                >
                  <div className="flex items-center justify-end gap-2 w-full">Giá (Price) {getSortIcon('price')}</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/80">
              {currentItems.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                  <td className="px-5 py-4 text-gray-500 dark:text-gray-400 font-medium tracking-wide">
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-5 py-4 font-bold text-gray-900 dark:text-gray-100">
                    {tx.ticker}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider inline-flex items-center ${
                      tx.type === 'BUY' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400'
                        : tx.type === 'SELL'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-400'
                    }`}>
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-medium text-gray-900 dark:text-gray-200">
                    {formatCurrency(tx.quantity)}
                  </td>
                  <td className="px-5 py-4 text-right font-medium text-gray-700 dark:text-gray-400">
                    {formatCurrency(tx.price)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* VÙNG ĐIỀU HƯỚNG PHÂN TRANG (PAGINATION) */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/50">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Hiển thị <span className="text-gray-900 dark:text-gray-200">{sortedTransactions.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1}</span> đến <span className="text-gray-900 dark:text-gray-200">{Math.min(safeCurrentPage * itemsPerPage, sortedTransactions.length)}</span> trên tổng số <span className="text-gray-900 dark:text-gray-200">{sortedTransactions.length}</span> records
          </span>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="px-3.5 py-1.5 text-sm font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-40 disabled:pointer-events-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:shadow-none"
            >
              Trước
            </button>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 px-1 bg-white dark:bg-transparent rounded px-2 select-none">
              {safeCurrentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages || totalPages === 0}
              className="px-3.5 py-1.5 text-sm font-semibold rounded-lg border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all disabled:opacity-40 disabled:pointer-events-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:shadow-none"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
