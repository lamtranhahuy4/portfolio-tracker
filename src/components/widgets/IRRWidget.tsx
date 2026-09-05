import React from 'react';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';

interface IRRWidgetProps {
  xirr?: number;
  language: 'vi' | 'en';
}

export default function IRRWidget({ xirr, language }: IRRWidgetProps) {
  const t = language === 'vi' ? {
    title: 'Tỷ suất Sinh lời Nội bộ (IRR)',
    desc: 'Hiệu suất thực tế tính theo dòng tiền (Annualized)',
    unavailable: 'Chưa đủ dữ liệu',
    vsRiskFree: 'So với lãi suất phi rủi ro (6%)',
    good: 'Tốt',
    bad: 'Thấp hơn tiết kiệm'
  } : {
    title: 'Internal Rate of Return (IRR)',
    desc: 'Annualized performance based on cash flows',
    unavailable: 'Not enough data',
    vsRiskFree: 'Vs Risk-free rate (6%)',
    good: 'Good',
    bad: 'Below savings rate'
  };

  const riskFreeRate = 0.06;

  if (xirr === undefined || xirr === null) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-center">
        <h3 className="text-sm font-semibold text-slate-400">{t.title}</h3>
        <p className="mt-2 text-xl font-bold text-slate-400">{t.unavailable}</p>
      </div>
    );
  }

  const isPositive = xirr >= 0;
  const isBeatingRiskFree = xirr >= riskFreeRate;
  const displayValue = new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'percent',
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero'
  }).format(xirr);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
            {t.title}
            <div className="group relative">
              <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
              <div className="pointer-events-none absolute left-1/2 bottom-full z-20 mb-2 w-48 -translate-x-1/2 rounded-md bg-slate-800 px-3 py-2 text-xs text-slate-200 opacity-0 transition-opacity group-hover:opacity-100">
                {t.desc}
              </div>
            </div>
          </h3>
          <p className="text-xs text-slate-400 mt-1">{t.desc}</p>
        </div>
        <div className={`p-2 rounded-full ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          {isPositive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
        </div>
      </div>

      <div className="mt-4">
        <span className={`text-3xl font-bold tracking-tight ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {displayValue}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
        <span className="text-xs text-slate-400">{t.vsRiskFree}</span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isBeatingRiskFree ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
          {isBeatingRiskFree ? t.good : t.bad}
        </span>
      </div>
    </div>
  );
}
