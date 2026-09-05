'use client';

import React from 'react';
import { DashboardLanguage, DASHBOARD_LANGUAGE_STORAGE_KEY } from '@/lib/dashboardLocale';
import { cn } from '@/lib/utils';
import { i18n } from '@/lib/i18n';

interface LanguageSwitcherProps {
  language: DashboardLanguage;
  setLanguage: (lang: DashboardLanguage) => void;
  className?: string;
}

export default function LanguageSwitcher({ language, setLanguage, className }: LanguageSwitcherProps) {
  const t = i18n[language].dashboard || { vietnamese: 'VI', english: 'EN' };

  const handleLanguageChange = (lang: DashboardLanguage) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DASHBOARD_LANGUAGE_STORAGE_KEY, lang);
      window.dispatchEvent(new CustomEvent('languagechange', { detail: lang }));
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-950/80 p-1 text-sm text-slate-300", className)}>
      <button 
        type="button" 
        onClick={() => handleLanguageChange('vi')} 
        className={cn("rounded-xl px-3 py-1.5 transition-colors", language === 'vi' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900')}
      >
        {t.vietnamese}
      </button>
      <button 
        type="button" 
        onClick={() => handleLanguageChange('en')} 
        className={cn("rounded-xl px-3 py-1.5 transition-colors", language === 'en' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-900')}
      >
        {t.english}
      </button>
    </div>
  );
}
