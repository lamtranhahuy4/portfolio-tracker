'use client';

import { useState } from 'react';
import { Calculator, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLanguage } from '@/lib/dashboardLocale';

interface TaxRateFormProps {
  initialTaxRate: number;
  language: DashboardLanguage;
}

const copy = {
  vi: {
    title: 'Thuế suất tính thuế',
    desc: 'Thuế suất áp dụng cho lãi chứng khoán khi bán (realized P&L). Mặc định 0.1% theo quy định Việt Nam.',
    label: 'Thuế suất (%)',
    placeholder: '0.1',
    save: 'Lưu',
    saving: 'Đang lưu...',
    success: 'Đã lưu thuế suất',
    error: 'Không thể lưu thuế suất',
    invalid: 'Giá trị không hợp lệ (0-100%)',
  },
  en: {
    title: 'Tax Rate',
    desc: 'Tax rate applied to stock profit when selling (realized P&L). Default 0.1% as per Vietnam regulations.',
    label: 'Tax Rate (%)',
    placeholder: '0.1',
    save: 'Save',
    saving: 'Saving...',
    success: 'Tax rate saved',
    error: 'Cannot save tax rate',
    invalid: 'Invalid value (0-100%)',
  },
};

export default function TaxRateForm({ initialTaxRate, language }: TaxRateFormProps) {
  const [taxRate, setTaxRate] = useState((initialTaxRate * 100).toString());
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const t = copy[language];

  const handleSave = async () => {
    const rate = parseFloat(taxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error(t.invalid);
      return;
    }

    setSaving(true);
    try {
      const { saveTaxRate } = await import('@/actions/portfolioSettings');
      await saveTaxRate(rate / 100);
      toast.success(t.success);
      setShowForm(false);
    } catch {
      toast.error(t.error);
    } finally {
      setSaving(false);
    }
  };

  const displayRate = (initialTaxRate * 100).toFixed(3);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <Calculator className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-200">{t.title}</h3>
            <p className="text-sm text-slate-400">{displayRate}%</p>
          </div>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors whitespace-nowrap"
        >
          {showForm ? 'Đóng / Close' : 'Sửa đổi / Edit'}
        </button>
      </div>

      {!showForm && (
        <p className="text-sm text-slate-500">{t.desc}</p>
      )}

      {showForm && (
        <div className="mt-2 pt-6 border-t border-slate-800 flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-slate-400 mb-2">
              {t.label}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.001"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                className="w-32 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder={t.placeholder}
              />
              <span className="text-slate-400 font-medium">%</span>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? t.saving : t.save}
          </button>
        </div>
      )}
    </div>
  );
}