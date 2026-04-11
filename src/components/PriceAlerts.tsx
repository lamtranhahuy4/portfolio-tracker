'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell, Plus, X, TrendingUp, TrendingDown, Loader2, Trash2, Check } from 'lucide-react';
import { DashboardLanguage } from '@/lib/dashboardLocale';
import { toast } from 'sonner';

interface PriceAlert {
  id: string;
  ticker: string;
  targetPrice: string;
  condition: 'above' | 'below';
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt?: Date;
}

interface QuoteData {
  ticker: string;
  price: number;
}

type NewAlertState = {
  ticker: string;
  targetPrice: string;
  condition: 'above' | 'below';
};

const copy = {
  vi: {
    title: 'Giá thông báo',
    subtitle: 'Cảnh báo khi giá đạt ngưỡng',
    addAlert: 'Thêm cảnh báo',
    ticker: 'Mã',
    targetPrice: 'Giá mục tiêu',
    condition: 'Điều kiện',
    above: 'Trên',
    below: 'Dưới',
    empty: 'Chưa có cảnh báo nào',
    emptyHint: 'Thêm cảnh báo để nhận thông báo khi giá đạt ngưỡng',
    loading: 'Đang tải...',
    delete: 'Xóa',
    triggered: 'Đã kích hoạt',
    active: 'Đang hoạt động',
    currentPrice: 'Giá hiện tại',
  },
  en: {
    title: 'Price Alerts',
    subtitle: 'Get notified when price reaches target',
    addAlert: 'Add alert',
    ticker: 'Ticker',
    targetPrice: 'Target price',
    condition: 'Condition',
    above: 'Above',
    below: 'Below',
    empty: 'No alerts set',
    emptyHint: 'Add alerts to get notified when price reaches target',
    loading: 'Loading...',
    delete: 'Delete',
    triggered: 'Triggered',
    active: 'Active',
    currentPrice: 'Current price',
  },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function PriceAlerts({ language }: { language: DashboardLanguage }) {
  const t = copy[language];
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [quotes, setQuotes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newAlert, setNewAlert] = useState<NewAlertState>({ ticker: '', targetPrice: '', condition: 'above' });
  const [isAdding, setIsAdding] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/price-alerts');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
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
        const newQuotes: Record<string, number> = {};
        data.quotes?.forEach((q: QuoteData) => {
          newQuotes[q.ticker] = q.price;
        });
        setQuotes(newQuotes);
      }
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (alerts.length === 0) return;
    const activeAlerts = alerts.filter((a) => a.isActive && !a.isTriggered);
    if (activeAlerts.length === 0) return;
    
    fetchQuotes(activeAlerts.map((a) => a.ticker));
    
    const interval = setInterval(() => {
      fetchQuotes(activeAlerts.map((a) => a.ticker));
    }, 30000);
    
    return () => clearInterval(interval);
  }, [alerts, fetchQuotes]);

  const handleAdd = async () => {
    if (!newAlert.ticker.trim() || !newAlert.targetPrice) return;
    setIsAdding(true);
    try {
      const response = await fetch('/api/price-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: newAlert.ticker.trim(),
          targetPrice: parseFloat(newAlert.targetPrice),
          condition: newAlert.condition,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setAlerts((prev) => [...prev, data.alert]);
        fetchQuotes([...alerts.filter((a) => a.isActive).map((a) => a.ticker), newAlert.ticker.toUpperCase().trim()]);
        setNewAlert({ ticker: '', targetPrice: '', condition: 'above' as const });
        setShowForm(false);
        toast.success(`Đã thêm cảnh báo cho ${newAlert.ticker.toUpperCase().trim()}`);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Không thể thêm cảnh báo');
      }
    } catch {
      toast.error('Đã xảy ra lỗi');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/price-alerts?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
        toast.success('Đã xóa cảnh báo');
      }
    } catch {
      toast.error('Đã xảy ra lỗi');
    }
  };

  const checkAlertTriggered = (alert: PriceAlert) => {
    const currentPrice = quotes[alert.ticker];
    if (!currentPrice) return null;
    
    const target = parseFloat(alert.targetPrice);
    const isTriggered = alert.condition === 'above' 
      ? currentPrice >= target 
      : currentPrice <= target;
    
    return isTriggered;
  };

  if (loading) {
    return (
      <div className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-amber-400" />
          <h3 className="text-lg font-semibold text-slate-100">{t.title}</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      </div>
    );
  }

  const activeAlerts = alerts.filter((a) => a.isActive && !a.isTriggered);
  const triggeredAlerts = alerts.filter((a) => a.isTriggered);

  return (
    <div className="rounded-[28px] border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-amber-400" />
          <h3 className="text-lg font-semibold text-slate-100">{t.title}</h3>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {showForm && (
        <div className="mb-4 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <input
              type="text"
              value={newAlert.ticker}
              onChange={(e) => setNewAlert((p) => ({ ...p, ticker: e.target.value.toUpperCase() }))}
              placeholder={t.ticker}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              maxLength={10}
            />
            <input
              type="number"
              value={newAlert.targetPrice}
              onChange={(e) => setNewAlert((p) => ({ ...p, targetPrice: e.target.value }))}
              placeholder={t.targetPrice}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
            <select
              value={newAlert.condition}
              onChange={(e) => setNewAlert((p) => ({ ...p, condition: e.target.value as 'above' | 'below' }))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="above">{t.above}</option>
              <option value="below">{t.below}</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newAlert.ticker.trim() || !newAlert.targetPrice || isAdding}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin inline mr-1" /> : null}
              {t.addAlert}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition-colors"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="text-center py-6">
          <Bell className="h-10 w-10 mx-auto text-slate-600 mb-3" />
          <p className="text-sm text-slate-400">{t.empty}</p>
          <p className="text-xs text-slate-500 mt-1">{t.emptyHint}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeAlerts.map((alert) => {
            const currentPrice = quotes[alert.ticker];
            const isTriggered = checkAlertTriggered(alert);
            
            return (
              <div
                key={alert.id}
                className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                  isTriggered 
                    ? 'bg-emerald-500/20 border border-emerald-500/30' 
                    : 'bg-slate-800/30 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    alert.condition === 'above' 
                      ? 'bg-emerald-500/20 text-emerald-400' 
                      : 'bg-rose-500/20 text-rose-400'
                  }`}>
                    {alert.condition === 'above' 
                      ? <TrendingUp className="h-5 w-5" /> 
                      : <TrendingDown className="h-5 w-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-slate-200">{alert.ticker}</p>
                    <p className="text-xs text-slate-400">
                      {alert.condition === 'above' ? t.above : t.below} {formatCurrency(parseFloat(alert.targetPrice))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {currentPrice ? (
                    <div className="text-right">
                      <p className="text-xs text-slate-500">{t.currentPrice}</p>
                      <p className={`font-medium ${isTriggered ? 'text-emerald-400' : 'text-slate-200'}`}>
                        {formatCurrency(currentPrice)}
                      </p>
                    </div>
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                  )}
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                    title={t.delete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
          
          {triggeredAlerts.length > 0 && (
            <div className="pt-2 border-t border-slate-700/50 mt-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{t.triggered}</p>
              {triggeredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-700/30 opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-emerald-400" />
                    <div>
                      <p className="font-medium text-slate-300">{alert.ticker}</p>
                      <p className="text-xs text-slate-500">
                        {formatCurrency(parseFloat(alert.targetPrice))} - {alert.condition === 'above' ? t.above : t.below}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
