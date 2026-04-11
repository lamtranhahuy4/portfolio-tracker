'use client';

import { useEffect, useState, useCallback } from 'react';
import { Eye, Plus, X, TrendingUp, TrendingDown, Loader2, Star } from 'lucide-react';
import { DashboardLanguage } from '@/lib/dashboardLocale';
import { toast } from 'sonner';

interface WatchlistItem {
  id: string;
  ticker: string;
  name?: string;
  notes?: string;
}

interface QuoteData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
}

const copy = {
  vi: {
    title: 'Watchlist',
    subtitle: 'Theo dõi cổ phiếu quan tâm',
    addTicker: 'Thêm mã...',
    add: 'Thêm',
    empty: 'Chưa có mã nào trong watchlist',
    emptyHint: 'Thêm mã cổ phiếu bạn quan tâm để theo dõi',
    loading: 'Đang tải...',
    remove: 'Xóa',
    price: 'Giá',
    change: 'Thay đổi',
  },
  en: {
    title: 'Watchlist',
    subtitle: 'Track stocks you care about',
    addTicker: 'Add ticker...',
    add: 'Add',
    empty: 'No tickers in watchlist',
    emptyHint: 'Add stocks you want to track',
    loading: 'Loading...',
    remove: 'Remove',
    price: 'Price',
    change: 'Change',
  },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Watchlist({ language }: { language: DashboardLanguage }) {
  const t = copy[language];
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [quotes, setQuotes] = useState<Record<string, QuoteData>>({});
  const [loading, setLoading] = useState(true);
  const [addingTicker, setAddingTicker] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    try {
      const response = await fetch('/api/watchlist');
      if (response.ok) {
        const data = await response.json();
        setItems(data.watchlist || []);
      }
    } catch (error) {
      console.error('Failed to fetch watchlist:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQuotes = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) return;
    try {
      const response = await fetch(`/api/quotes?tickers=${tickers.join(',')}`);
      if (response.ok) {
        const data = await response.json();
        const newQuotes: Record<string, QuoteData> = {};
        data.quotes?.forEach((q: { ticker: string; price: number; change?: number; changePercent?: number }) => {
          newQuotes[q.ticker] = {
            ticker: q.ticker,
            price: q.price,
            change: q.change || 0,
            changePercent: q.changePercent || 0,
          };
        });
        setQuotes(newQuotes);
      }
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    }
  }, []);

  useEffect(() => {
    fetchWatchlist();
  }, [fetchWatchlist]);

  useEffect(() => {
    if (items.length === 0) return;
    fetchQuotes(items.map((i) => i.ticker));
    
    const interval = setInterval(() => {
      fetchQuotes(items.map((i) => i.ticker));
    }, 60000);
    
    return () => clearInterval(interval);
  }, [items, fetchQuotes]);

  const handleAdd = async () => {
    if (!addingTicker.trim()) return;
    setIsAdding(true);
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: addingTicker.trim() }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setItems((prev) => [...prev, data.watchlist]);
        fetchQuotes([...items.map((i) => i.ticker), addingTicker.toUpperCase().trim()]);
        setAddingTicker('');
        toast.success(`Đã thêm ${addingTicker.toUpperCase().trim()} vào watchlist`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Không thể thêm mã');
      }
    } catch {
      toast.error('Đã xảy ra lỗi');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemove = async (id: string, ticker: string) => {
    try {
      const response = await fetch(`/api/watchlist?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
        setQuotes((prev) => {
          const newQuotes = { ...prev };
          delete newQuotes[ticker];
          return newQuotes;
        });
        toast.success(`Đã xóa ${ticker} khỏi watchlist`);
      }
    } catch {
      toast.error('Đã xảy ra lỗi');
    }
  };

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-amber-400" />
          <h3 className="text-lg font-semibold text-slate-100">{t.title}</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-400" />
          <h3 className="text-lg font-semibold text-slate-100">{t.title}</h3>
        </div>
        <span className="text-xs text-slate-500">{items.length} {language === 'vi' ? 'mã' : 'tickers'}</span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6">
          <Eye className="h-10 w-10 mx-auto text-slate-600 mb-3" />
          <p className="text-sm text-slate-400">{t.empty}</p>
          <p className="text-xs text-slate-500 mt-1">{t.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          {items.map((item) => {
            const quote = quotes[item.ticker];
            return (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                    <span className="text-sm font-bold text-slate-300">{item.ticker.slice(0, 2)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-200">{item.ticker}</p>
                    {item.name && (
                      <p className="text-xs text-slate-500 truncate max-w-[120px]">{item.name}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {quote ? (
                    <>
                      <div className="text-right">
                        <p className="font-medium text-slate-200">
                          {formatCurrency(quote.price)}
                        </p>
                        <p className={`text-xs flex items-center gap-1 ${quote.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {quote.changePercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemove(item.id, item.ticker)}
                        className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                        title={t.remove}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={addingTicker}
          onChange={(e) => setAddingTicker(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder={t.addTicker}
          className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          maxLength={10}
        />
        <button
          onClick={handleAdd}
          disabled={!addingTicker.trim() || isAdding}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t.add}
        </button>
      </div>
    </div>
  );
}
