'use client';

import { Play, UploadCloud } from 'lucide-react';
import { MOCK_TRANSACTIONS, MOCK_CASH_EVENTS } from '@/lib/mockData';
import { usePortfolioStore } from '@/store/usePortfolioStore';

export default function EmptyStateHero({ language }: { language: 'vi' | 'en' }) {
  const setTransactions = usePortfolioStore((state) => state.setTransactions);
  const setCashEvents = usePortfolioStore((state) => state.setCashEvents);

  const t = language === 'vi' ? {
    title: 'Bắt đầu hành trình đầu tư của bạn',
    desc: 'Bảng điều khiển hiện đang trống. Hãy nhập file lịch sử giao dịch để xem sức mạnh phân tích của hệ thống.',
    demoBtn: 'Trải nghiệm Dữ liệu Mẫu',
    uploadBtn: 'Tải file dữ liệu',
  } : {
    title: 'Begin your investment journey',
    desc: 'The dashboard is currently empty. Import your transaction ledger to see the analytical power of the system.',
    demoBtn: 'Try Demo Data',
    uploadBtn: 'Upload Data',
  };

  const handleLoadDemo = () => {
    // Inject mock data into Zustand store without hitting DB
    setTransactions(MOCK_TRANSACTIONS);
    setCashEvents(MOCK_CASH_EVENTS);
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 mt-12 bg-slate-900/40 border border-slate-800 rounded-[32px] max-w-4xl mx-auto shadow-2xl backdrop-blur-md">
      <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
        <UploadCloud className="w-10 h-10 text-blue-400" />
      </div>
      <h2 className="text-3xl font-bold text-slate-100 mb-4">{t.title}</h2>
      <p className="text-slate-400 mb-10 text-center max-w-xl text-lg leading-relaxed">{t.desc}</p>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <button 
          onClick={handleLoadDemo}
          className="flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-2xl shadow-xl shadow-blue-900/30 transition-all hover:scale-105"
        >
          <Play className="w-5 h-5 fill-current" />
          {t.demoBtn}
        </button>
      </div>
    </div>
  );
}
