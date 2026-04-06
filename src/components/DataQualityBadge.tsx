'use client';

import { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, Clock, RefreshCw, Shield } from 'lucide-react';
import { cn } from '@/components/MarkToMarketGrid';

interface DataQualityBadgeProps {
  type: 'fresh' | 'stale' | 'manual' | 'unknown';
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const labels = {
  fresh: { vi: 'Cập nhật', en: 'Live' },
  stale: { vi: 'Cũ', en: 'Stale' },
  manual: { vi: 'Thủ công', en: 'Manual' },
  unknown: { vi: 'Không rõ', en: 'Unknown' },
};

export default function DataQualityBadge({ 
  type, 
  showLabel = true, 
  size = 'sm',
  className 
}: DataQualityBadgeProps) {
  const config = useMemo(() => {
    const labelText = labels[type]?.vi || labels.unknown.vi;
    switch (type) {
      case 'fresh':
        return {
          icon: CheckCircle2,
          label: labelText,
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/30',
        };
      case 'stale':
        return {
          icon: AlertTriangle,
          label: labelText,
          color: 'text-amber-400',
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
        };
      case 'manual':
        return {
          icon: Shield,
          label: labelText,
          color: 'text-blue-400',
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
        };
      default:
        return {
          icon: Clock,
          label: labelText,
          color: 'text-slate-400',
          bg: 'bg-slate-500/10',
          border: 'border-slate-500/30',
        };
    }
  }, [type]);

  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-1';
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium uppercase tracking-wide',
        padding,
        textSize,
        config.bg,
        config.border,
        config.color,
        className
      )}
    >
      <Icon className={iconSize} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

interface FreshnessIndicatorProps {
  lastUpdated: Date | string | null;
  ttlMinutes: number;
  className?: string;
}

export function FreshnessIndicator({ lastUpdated, ttlMinutes, className }: FreshnessIndicatorProps) {
  if (!lastUpdated) {
    return <DataQualityBadge type="unknown" showLabel={false} className={className} />;
  }

  const updatedTime = new Date(lastUpdated);
  const now = new Date();
  const ageMs = now.getTime() - updatedTime.getTime();
  const ageMinutes = ageMs / (1000 * 60);
  const ttlMs = ttlMinutes * 60 * 1000;
  const maxStaleMs = ttlMs * 3;

  if (ageMs > maxStaleMs) {
    return <DataQualityBadge type="stale" size="sm" className={className} />;
  }

  if (ageMs <= ttlMs) {
    return <DataQualityBadge type="fresh" size="sm" className={className} />;
  }

  return <DataQualityBadge type="stale" size="sm" className={className} />;
}

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  lastRefreshed: Date | null;
  className?: string;
}

export function RefreshButton({ 
  onRefresh, 
  isRefreshing, 
  lastRefreshed,
  className 
}: RefreshButtonProps) {
  return (
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className={cn(
        'inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      title={lastRefreshed 
        ? `Last updated: ${lastRefreshed.toLocaleTimeString()}` 
        : 'Refresh prices'}
    >
      <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
      {isRefreshing ? 'Đang cập nhật...' : 'Cập nhật'}
    </button>
  );
}

interface DataProvenanceProps {
  source: string | null;
  timestamp: Date | string | null;
  isManualOverride?: boolean;
  className?: string;
}

export function DataProvenance({ 
  source, 
  timestamp, 
  isManualOverride = false,
  className 
}: DataProvenanceProps) {
  const sourceLabel = useMemo(() => {
    if (isManualOverride) return 'Nhập tay';
    switch (source?.toUpperCase()) {
      case 'DNSE': return 'DNSE';
      case 'COINGECKO': return 'CoinGecko';
      case 'MANUAL': return 'Nhập tay';
      default: return source || 'Không rõ';
    }
  }, [source, isManualOverride]);

  return (
    <div className={cn('flex items-center gap-2 text-xs text-slate-500', className)}>
      <span className="font-medium">Nguồn: {sourceLabel}</span>
      {timestamp && (
        <>
          <span>•</span>
          <span>{new Date(timestamp).toLocaleTimeString()}</span>
        </>
      )}
    </div>
  );
}
