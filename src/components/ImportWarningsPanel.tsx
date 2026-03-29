'use client';

import { useState } from 'react';
import { usePortfolioStore } from '@/store/usePortfolioStore';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

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
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-rose-900/50 bg-rose-950/20 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div
        className="flex cursor-pointer items-center justify-between border-b border-rose-900/40 bg-rose-950/10 p-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`shrink-0 rounded-xl p-2 ${isPerfect ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
            {isPerfect ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-100">
              Ket qua import gan nhat
              <span className="text-xs font-normal text-slate-500">({importedAt.toLocaleTimeString('vi-VN')})</span>
            </h3>
            <p className="mt-0.5 max-w-[200px] truncate font-mono text-xs text-slate-400">{summary.fileName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 pr-2">
          <div className="hidden flex-col gap-1 text-right text-xs sm:flex">
            <span className="whitespace-nowrap font-medium text-slate-400"><strong className="text-emerald-300">{summary.acceptedRows}</strong> hop le</span>
            {summary.rejectedRows > 0 && <span className="whitespace-nowrap font-medium text-slate-400"><strong className="text-rose-300">{summary.rejectedRows}</strong> bo qua</span>}
          </div>
          {expanded ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4">
          {isPerfect ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              Du lieu hoan hao. Khong co dong nao bi bo qua.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-rose-900/40">
                <table className="w-full border-collapse text-left text-sm text-slate-400">
                  <thead className="border-b border-rose-900/40 bg-slate-950/40 text-xs font-medium uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="w-16 px-4 py-3 text-center">Dong</th>
                      <th className="min-w-[200px] px-4 py-3 font-bold text-rose-300">Ly do loi</th>
                      <th className="px-4 py-3 font-mono">Lenh</th>
                      <th className="px-4 py-3 font-mono">Ma TS</th>
                      <th className="px-4 py-3 font-mono">Khoi luong</th>
                      <th className="px-4 py-3 font-mono">Gia khop</th>
                      <th className="px-4 py-3 font-mono">Ngay GD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rose-900/20 bg-transparent font-mono text-xs">
                    {displayWarnings.map((w, idx) => (
                      <tr key={`${w.row}-${idx}`} className="transition-colors hover:bg-rose-900/10">
                        <td className="px-4 py-2.5 text-center font-bold text-slate-200">{w.row}</td>
                        <td className="px-4 py-2.5 font-sans text-sm leading-tight text-rose-300">{w.message}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap"><span className="inline-block max-w-[80px] truncate rounded bg-slate-900 px-1.5 py-0.5 text-slate-400" title={w.rawType || '-'}>{w.rawType || '-'}</span></td>
                        <td className="px-4 py-2.5 whitespace-nowrap"><span className="inline-block max-w-[60px] rounded bg-slate-900 px-1.5 py-0.5 font-bold text-slate-400" title={w.rawTicker || '-'}>{w.rawTicker || '-'}</span></td>
                        <td className="px-4 py-2.5 whitespace-nowrap"><span className="inline-block max-w-[80px] truncate rounded bg-slate-900 px-1.5 py-0.5 text-slate-400" title={w.rawQuantity || '-'}>{w.rawQuantity || '-'}</span></td>
                        <td className="px-4 py-2.5 whitespace-nowrap"><span className="inline-block max-w-[80px] truncate rounded bg-slate-900 px-1.5 py-0.5 text-slate-400" title={w.rawPrice || '-'}>{w.rawPrice || '-'}</span></td>
                        <td className="px-4 py-2.5 whitespace-nowrap"><span className="inline-block max-w-[100px] truncate rounded bg-slate-900 px-1.5 py-0.5 text-slate-400" title={w.rawDate || '-'}>{w.rawDate || '-'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {warnings.length > 10 && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800"
                  >
                    {showAll ? 'Thu gon danh sach' : `Xem them ${warnings.length - 10} dong loi`}
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
