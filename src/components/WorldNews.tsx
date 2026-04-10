'use client';

import { useEffect, useState } from 'react';
import { Globe, ExternalLink, Clock, Loader2 } from 'lucide-react';
import { DashboardLanguage } from '@/lib/dashboardLocale';

interface NewsItem {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

const copy = {
  vi: {
    title: 'Tin Tức Thị Trường Thế Giới',
    loading: 'Đang tải tin tức...',
    noNews: 'Không có tin tức',
    source: 'Nguồn',
  },
  en: {
    title: 'World Market News',
    loading: 'Loading news...',
    noNews: 'No news available',
    source: 'Source',
  },
};

function formatTime(timestamp: number, language: DashboardLanguage) {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffHours < 1) return `${Math.floor(diffHours * 60)}m ago`;
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  if (diffHours < 48) return 'Yesterday';
  return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { day: 'numeric', month: 'short' });
}

export default function WorldNews({ language }: { language: DashboardLanguage }) {
  const t = copy[language];
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const response = await fetch('/api/world-news?limit=5');
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setNews(data.news || []);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-slate-100">{t.title}</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          <span className="ml-2 text-sm text-slate-500">{t.loading}</span>
        </div>
      </div>
    );
  }

  if (error || news.length === 0) {
    return (
      <div className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-slate-100">{t.title}</h3>
        </div>
        <p className="text-center text-sm text-slate-500 py-4">{t.noNews}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-slate-100">{t.title}</h3>
        </div>
        <span className="text-xs text-slate-500">{t.source}: Bloomberg</span>
      </div>

      <div className="space-y-3">
        {news.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 transition-colors">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-slate-200 group-hover:text-blue-400 transition-colors line-clamp-2">
                  {item.headline}
                </h4>
                <div className="flex items-center gap-2 mt-1.5">
                  <Clock className="h-3 w-3 text-slate-500" />
                  <span className="text-xs text-slate-500">{formatTime(item.datetime, language)}</span>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-500 group-hover:text-blue-400 transition-colors shrink-0 mt-1" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
