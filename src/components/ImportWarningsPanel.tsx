'use client';

import { useState } from 'react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { AlertCircle, FileSpreadsheet, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

export default function ImportWarningsPanel() {
  const lastImportResult = usePortfolioStore((state) => state.lastImportResult);
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (!lastImportResult) {
    return null;
  }

  const { summary, warnings, importedAt } = lastImportResult;
  const isPerfect = warnings.length === 0 && summary.acceptedRows > 0;
  
  const displayWarnings = showAll ? warnings : warnings.slice(0, Math.min(warnings.length, 10));

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full mt-4">
      {/* HEADER TÓM TẮT */}
      <div 
        className="p-4 bg-gray-50 dark:bg-gray-800 cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl shrink-0 ${isPerfect ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'}`}>
             {isPerfect ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm">
              Kết quả import gần nhất
              <span className="font-normal text-xs text-gray-400">({importedAt.toLocaleTimeString('vi-VN')})</span>
            </h3>
            <p className="text-xs text-gray-500 font-mono mt-0.5 truncate max-w-[200px]">{summary.fileName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pr-2">
           <div className="flex flex-col text-right text-xs gap-1 hidden sm:flex">
             <span className="text-gray-500 font-medium whitespace-nowrap"><strong className="text-emerald-600 dark:text-emerald-400">{summary.acceptedRows}</strong> hợp lệ</span>
             {summary.rejectedRows > 0 && <span className="text-gray-500 font-medium whitespace-nowrap"><strong className="text-orange-600 dark:text-orange-400">{summary.rejectedRows}</strong> bỏ qua</span>}
           </div>
           {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {/* CHI TIẾT WARNINGS */}
      {expanded && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
           {isPerfect ? (
             <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center py-6 gap-2">
               <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
               Dữ liệu hoàn hảo. Không có dòng nào bị bỏ qua.
             </div>
           ) : (
             <>
               <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                 <table className="w-full text-left text-sm text-gray-600 dark:text-gray-400 border-collapse">
                   <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase font-medium text-gray-500 border-b border-gray-200 dark:border-gray-800 tracking-wider">
                     <tr>
                       <th className="px-4 py-3 shrink-0 w-16 text-center">Dòng</th>
                       <th className="px-4 py-3 text-orange-600 dark:text-orange-400 font-bold min-w-[200px]">Lý do lỗi</th>
                       <th className="px-4 py-3 font-mono">Lệnh</th>
                       <th className="px-4 py-3 font-mono">Mã TS</th>
                       <th className="px-4 py-3 font-mono">Khối Lượng</th>
                       <th className="px-4 py-3 font-mono">Giá Khớp</th>
                       <th className="px-4 py-3 font-mono">Ngày GD</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900 font-mono text-xs">
                     {displayWarnings.map((w, idx) => (
                       <tr key={`${w.row}-${idx}`} className="hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors">
                         <td className="px-4 py-2.5 text-center font-bold text-gray-900 dark:text-gray-200">{w.row}</td>
                         <td className="px-4 py-2.5 text-orange-600 dark:text-orange-400 leading-tight font-sans text-sm">{w.message}</td>
                         <td className="px-4 py-2.5 whitespace-nowrap"><span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 truncate max-w-[80px] inline-block" title={w.rawType || '-'}>{w.rawType || '-'}</span></td>
                         <td className="px-4 py-2.5 whitespace-nowrap"><span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 font-bold max-w-[60px] inline-block" title={w.rawTicker || '-'}>{w.rawTicker || '-'}</span></td>
                         <td className="px-4 py-2.5 whitespace-nowrap"><span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 max-w-[80px] inline-block truncate" title={w.rawQuantity || '-'}>{w.rawQuantity || '-'}</span></td>
                         <td className="px-4 py-2.5 whitespace-nowrap"><span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 max-w-[80px] inline-block truncate" title={w.rawPrice || '-'}>{w.rawPrice || '-'}</span></td>
                         <td className="px-4 py-2.5 whitespace-nowrap"><span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-500 max-w-[100px] inline-block truncate" title={w.rawDate || '-'}>{w.rawDate || '-'}</span></td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
               
               {warnings.length > 10 && (
                 <div className="mt-4 flex justify-center">
                   <button 
                     onClick={() => setShowAll(!showAll)}
                     className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-semibold transition-colors px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-full"
                   >
                     {showAll ? 'Thu gọn danh sách' : `Xem thêm ${warnings.length - 10} dòng lỗi`}
                   </button>
                 </div>
               )}
             </>
           )}
        </div>
      )}
    </div>
  );
}
