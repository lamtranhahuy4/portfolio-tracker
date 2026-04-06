'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/components/MarkToMarketGrid';
import { DashboardLanguage } from '@/lib/dashboardLocale';

export type ErrorSeverity = 'error' | 'warning' | 'info' | 'success';

interface ErrorMessage {
  id: string;
  severity: ErrorSeverity;
  title: string;
  description?: string;
  context?: Record<string, string | number>;
  timestamp: Date;
  dismissible?: boolean;
}

interface ErrorDisplayProps {
  errors: ErrorMessage[];
  onDismiss?: (id: string) => void;
  language?: DashboardLanguage;
  maxVisible?: number;
}

const severityConfig = {
  error: {
    icon: XCircle,
    iconColor: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    titleColor: 'text-rose-200',
    descColor: 'text-rose-300/70',
  },
  warning: {
    icon: AlertCircle,
    iconColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    titleColor: 'text-amber-200',
    descColor: 'text-amber-300/70',
  },
  info: {
    icon: Info,
    iconColor: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    titleColor: 'text-blue-200',
    descColor: 'text-blue-300/70',
  },
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    titleColor: 'text-emerald-200',
    descColor: 'text-emerald-300/70',
  },
};

const translations = {
  vi: {
    error: 'Lỗi',
    warning: 'Cảnh báo',
    info: 'Thông tin',
    success: 'Thành công',
    dismissed: 'Đã đóng',
    showMore: 'Xem thêm',
    showLess: 'Thu gọn',
    context: 'Chi tiết',
  },
  en: {
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    success: 'Success',
    dismissed: 'Dismissed',
    showMore: 'Show more',
    showLess: 'Show less',
    context: 'Context',
  },
};

export function ErrorDisplay({ 
  errors, 
  onDismiss, 
  language = 'vi',
  maxVisible = 3 
}: ErrorDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  
  const t = translations[language];
  
  const visibleErrors = expanded ? errors : errors.slice(0, maxVisible);
  const hiddenCount = errors.length - maxVisible;

  if (errors.length === 0) return null;

  return (
    <div className="space-y-2">
      {visibleErrors.map((error) => {
        if (dismissed.has(error.id)) return null;
        
        const config = severityConfig[error.severity];
        const Icon = config.icon;
        
        return (
          <div
            key={error.id}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-4',
              config.bgColor,
              config.borderColor
            )}
          >
            <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', config.iconColor)} />
            <div className="flex-1 min-w-0">
              <h4 className={cn('font-semibold text-sm', config.titleColor)}>
                {error.title}
              </h4>
              {error.description && (
                <p className={cn('mt-1 text-sm', config.descColor)}>
                  {error.description}
                </p>
              )}
              {error.context && Object.keys(error.context).length > 0 && (
                <div className="mt-2 rounded-lg bg-black/20 p-2 text-xs font-mono">
                  <p className="text-slate-400 mb-1">{t.context}:</p>
                  {Object.entries(error.context).map(([key, value]) => (
                    <div key={key} className="flex justify-between gap-4">
                      <span className="text-slate-400">{key}:</span>
                      <span className="text-slate-200">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {error.dismissible !== false && onDismiss && (
              <button
                onClick={() => {
                  onDismiss(error.id);
                  setDismissed((prev) => new Set([...prev, error.id]));
                }}
                className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                title={t.dismissed}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
      
      {hiddenCount > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
        >
          {t.showMore} ({hiddenCount})
        </button>
      )}
    </div>
  );
}

interface ErrorContext {
  field?: string;
  value?: string | number;
  expected?: string;
  actual?: string;
  recordId?: string;
  row?: number;
  [key: string]: string | number | undefined;
}

export function createUserFriendlyError(
  message: string,
  context?: ErrorContext
): string {
  if (!context) return message;
  
  const parts: string[] = [message];
  
  if (context.field && context.value !== undefined) {
    parts.push(`Trường "${context.field}" có giá trị "${context.value}"`);
  }
  
  if (context.expected && context.actual) {
    parts.push(`Giá trị mong đợi: ${context.expected}, thực tế: ${context.actual}`);
  }
  
  if (context.row) {
    parts.push(`Dòng ${context.row}`);
  }
  
  return parts.join('. ');
}

export function useErrorManager() {
  const [errors, setErrors] = useState<ErrorMessage[]>([]);

  const addError = (error: Omit<ErrorMessage, 'id' | 'timestamp'>) => {
    const newError: ErrorMessage = {
      ...error,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setErrors((prev) => [...prev, newError]);
  };

  const dismissError = (id: string) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  };

  const clearAll = () => {
    setErrors([]);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setErrors((prev) => 
        prev.filter((e) => Date.now() - e.timestamp.getTime() < 10000)
      );
    }, 10000);

    return () => clearTimeout(timer);
  }, [errors]);

  return { errors, addError, dismissError, clearAll };
}
