'use client';

import { useState, useTransition } from 'react';
import { Calendar, Landmark, Save, ArrowRight, ArrowLeft, Upload, FileSpreadsheet } from 'lucide-react';
import { saveCutoffSettings } from '@/actions/portfolioSettings';
import { usePortfolioStore } from '@/store/usePortfolioStore';

export default function OnboardingWizard({ language }: { language: 'vi' | 'en' }) {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState<string>('');
  const [netContributions, setNetContributions] = useState<string>('0');
  const [cashBalance, setCashBalance] = useState<string>('0');
  const [error, setError] = useState<string | null>(null);

  const setPortfolioSettings = usePortfolioStore((state) => state.setPortfolioSettings);

  const t = language === 'vi' ? {
    welcome: 'Chào Mừng Đến Với Portfolio Tracker',
    subtitle: 'Hãy cùng thiết lập các thông số cơ bản để hệ thống bắt đầu theo dõi tài sản của bạn chuẩn xác nhất.',
    step1: 'Bước 1: Ngày Chốt Sổ',
    step1Desc: 'Nếu bạn có lịch sử giao dịch từ lâu và không muốn nhập lại từ đầu, hãy chọn một "ngày cắt" làm mốc bắt đầu.',
    cutoffDate: 'Ngày chốt sổ (Tùy chọn)',
    step2: 'Bước 2: Nguồn Vốn Mở Đầu',
    step2Desc: 'Nhập số tiền và vốn bạn đang có tại ngày chốt sổ mục tiêu.',
    netContributions: 'Tổng Vốn Đầu Tư (VND)',
    cashBalance: 'Tiền Mặt Sẵn Có (VND)',
    step3: 'Bước 3: Hoàn Tất Cài Đặt',
    step3Desc: 'Cấu hình hoàn tất! Ngay sau đây, bạn có thể tải file CSV lịch sử giao dịch lên hoặc khai báo vị thế cổ phiếu.',
    next: 'Tiếp tục',
    back: 'Quay lại',
    saveAndStart: 'Bắt Đầu Sử Dụng',
    saving: 'Đang lưu...',
    uploadHint: 'Tải CSV',
    manualHint: 'Nhập tay vị thế'
  } : {
    welcome: 'Welcome to Portfolio Tracker',
    subtitle: 'Let\'s set up the initial parameters so the engine can accurately track your assets.',
    step1: 'Step 1: Cut-off Date',
    step1Desc: 'If you have old transaction history and don\'t want to re-import everything, pick a cut-off date to start fresh from.',
    cutoffDate: 'Cut-off Date (Optional)',
    step2: 'Step 2: Starting Capital',
    step2Desc: 'Enter your total invested capital and available cash balance at the cut-off date.',
    netContributions: 'Initial Net Contributions (VND)',
    cashBalance: 'Available Cash Balance (VND)',
    step3: 'Step 3: Setup Complete',
    step3Desc: 'All set! Shortly after this, you will be able to upload your CSV files or manually define opening stock positions.',
    next: 'Next',
    back: 'Back',
    saveAndStart: 'Get Started',
    saving: 'Saving...',
    uploadHint: 'Upload CSV',
    manualHint: 'Add trades manually'
  };

  const handleFinish = () => {
    setError(null);
    const pc = Number(netContributions);
    const cb = Number(cashBalance);
    if (isNaN(pc) || isNaN(cb)) {
      setError('Values must be numbers.');
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          globalCutoffDate: date ? new Date(date) : null,
          initialNetContributions: pc,
          initialCashBalance: cb
        };
        await saveCutoffSettings(payload);
        setPortfolioSettings(payload);
        // Tắt Wizard sẽ do DashboardClient lo khi globalCutoffDate được cập nhật khác null
      } catch (err: any) {
        setError(err.message || 'Something went wrong');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-950/80">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-8 pb-6 border-b border-slate-800 bg-gradient-to-b from-slate-800/50">
          <h1 className="text-2xl font-bold text-white tracking-tight">{t.welcome}</h1>
          <p className="text-slate-400 mt-2 text-sm">{t.subtitle}</p>
          
          {/* Progress indicators */}
          <div className="flex gap-2 mt-6">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${step >= i ? 'bg-blue-500' : 'bg-slate-800'}`} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-8 bg-slate-900 flex-1 min-h-[300px]">
          {error && (
            <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                {t.step1}
              </h2>
              <p className="text-sm text-slate-400 mt-2 mb-6">{t.step1Desc}</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t.cutoffDate}</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 outline-none focus:border-blue-500 transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-400" />
                {t.step2}
              </h2>
              <p className="text-sm text-slate-400 mt-2 mb-6">{t.step2Desc}</p>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t.netContributions}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={netContributions}
                      onChange={(e) => setNetContributions(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 outline-none focus:border-emerald-500 transition-colors"
                    />
                    <span className="absolute right-4 top-3.5 text-slate-500 text-sm font-medium pointer-events-none">VND</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t.cashBalance}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={cashBalance}
                      onChange={(e) => setCashBalance(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 outline-none focus:border-emerald-500 transition-colors"
                    />
                    <span className="absolute right-4 top-3.5 text-slate-500 text-sm font-medium pointer-events-none">VND</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                {t.step3}
              </h2>
              <p className="text-sm text-slate-400 mt-2 mb-6">{t.step3Desc}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-center opacity-80">
                  <div className="p-3 bg-blue-500/10 rounded-full text-blue-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-300">{t.uploadHint}</span>
                </div>
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-center opacity-80">
                  <div className="p-3 bg-indigo-500/10 rounded-full text-indigo-400">
                    <Landmark className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-slate-300">{t.manualHint}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1 || isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-0 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20 transition-all"
            >
              {t.next}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              {isPending ? t.saving : t.saveAndStart}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
