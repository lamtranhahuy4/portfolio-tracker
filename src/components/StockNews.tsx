'use client';

import { useEffect, useState } from 'react';
import { Newspaper, ExternalLink, Loader2 } from 'lucide-react';
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
  news: Record<string, NewsArticle[]>;
}

export default function StockNews() {
  const metrics = usePortfolioMetrics();
  const [news, setNews] = useState<StockNewsData['news']>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stockTickers = metrics.holdings
    .filter((h) => h.assetClass === 'STOCK' && h.totalShares > 0)
    .map((h) => h.ticker)
    .sort();

  useEffect(() => {
    if (stockTickers.length === 0) {
      setIsLoading(false);
      return;
    }

    const fetchNews = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/stock-news?tickers=${encodeURIComponent(stockTickers.join(','))}`);
        if (!response.ok) throw new Error('Failed to fetch');
        const data: StockNewsData = await response.json();
        setNews(data.news || {});
      } catch {
        setError('Không thể tải tin tức');
      } finally {
        setIsLoading(false);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [stockTickers]);

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

  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950">
          <Newspaper className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Tin tức cổ phiếu</h3>
          <p className="text-xs text-slate-500">{stockTickers.length} mã đang theo dõi</p>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      )}

      {error && (
        <div className="text-center py-6 text-sm text-slate-400">
          {error}
        </div>
      )}

      {!isLoading && !error && (
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

          {stockTickers.every((t) => !news[t] || news[t].length === 0) && (
            <div className="text-center py-4 text-sm text-slate-500">
              Không có tin tức gần đây cho các mã này
            </div>
          )}
        </div>
      )}
    </div>
  );
}
