'use client';

import { useEffect, useState, useCallback } from 'react';
import { Newspaper, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { usePortfolioMetrics } from '@/store/usePortfolioStore';

interface NewsArticle {
  id: number;
  category: string;
  datetime: number;
  headline: string;
  image: string;
  source: string;
  url: string;
}

interface StockNewsData {
  news?: Record<string, NewsArticle[]>;
  error?: string;
}

export default function StockNews() {
  const metrics = usePortfolioMetrics();
  const [news, setNews] = useState<Record<string, NewsArticle[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  const stockTickers = metrics.holdings
    .filter((h) => h.assetClass === 'STOCK' && h.totalShares > 0)
    .map((h) => h.ticker)
    .sort();

  const fetchNews = useCallback(async () => {
    if (stockTickers.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/stock-news?tickers=${encodeURIComponent(stockTickers.join(','))}`);
      if (!response.ok) throw new Error('Failed to fetch');
      const data: StockNewsData = await response.json();
      if (data.error) {
        setError('Tin tức tạm thời không khả dụng');
      } else {
        setNews(data.news || {});
      }
      setHasLoaded(true);
    } catch {
      setError('Không thể tải tin tức');
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [stockTickers]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  if (stockTickers.length === 0) {
    return null;
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 1) return `${Math.floor(diffHours * 60)} phút trước`;
    if (diffHours < 24) return `${Math.floor(diffHours)} giờ trước`;
    if (diffHours < 48) return 'Hôm qua';
    return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
  };

  const hasNews = stockTickers.some((t) => news[t] && news[t].length > 0);

  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950">
            <Newspaper className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Tin tức cổ phiếu</h3>
            <p className="text-xs text-slate-500">{stockTickers.length} mã đang theo dõi</p>
          </div>
        </div>
        <button
          onClick={fetchNews}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
          title="Làm mới tin tức"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {isLoading && !hasLoaded && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      )}

      {error && (
        <div className="text-center py-4 text-sm text-slate-400">
          {error}
        </div>
      )}

      {hasLoaded && !isLoading && !error && (
        <div className="space-y-4">
          {stockTickers.map((ticker) => {
            const tickerNews = news[ticker] || [];
            if (tickerNews.length === 0) return null;

            return (
              <div key={ticker} className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                  {ticker}
                </div>
                <div className="space-y-2">
                  {tickerNews.map((article) => (
                    <a
                      key={article.id}
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl border border-slate-800 bg-slate-950/50 p-3 transition-colors hover:bg-slate-800/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-200 line-clamp-2 leading-snug">
                            {article.headline}
                          </p>
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                            <span>{article.source}</span>
                            <span className="text-slate-600">•</span>
                            <span>{formatTime(article.datetime)}</span>
                          </div>
                        </div>
                        <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-slate-500" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}

          {!hasNews && (
            <div className="text-center py-4 text-sm text-slate-500">
              Không có tin tức gần đây cho các mã này
            </div>
          )}
        </div>
      )}
    </div>
  );
}
