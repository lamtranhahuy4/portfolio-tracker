'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, UserCircle2, Activity, HardDrive, Filter, Clock, Languages, Smartphone, Monitor, Globe, LogOut, Shield, AlertTriangle } from 'lucide-react';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import DeletePortfolioDataForm from '@/components/DeletePortfolioDataForm';
import ImportHistoryCard from '@/components/ImportHistoryCard';
import CutoffSetupForm from '@/components/CutoffSetupForm';
import { DASHBOARD_LANGUAGE_STORAGE_KEY, DashboardLanguage } from '@/lib/dashboardLocale';
import { ImportBatchRecord } from '@/types/importAudit';
import { toast } from 'sonner';

interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date | string;
  lastUsedAt: Date | string;
  expiresAt: Date | string;
}

interface SecurityStatus {
  totalSessions: number;
  failedAttemptsInWindow: number;
  isLocked: boolean;
  lockoutReason: string | null;
  lockoutUntil: Date | string | null;
}

interface AccountSummary {
  user: {
    id: string;
    email: string;
    createdAt: Date;
  };
  transactionCount: number;
  distinctTickerCount: number;
  lastTransactionAt: Date | null;
  sourceBreakdown: Array<{ source: string; count: number }>;
  importBatches: ImportBatchRecord[];
  portfolioSettings: {
    feeDebt: number;
    globalCutoffDate: Date | null;
    initialNetContributions: number;
    initialCashBalance: number;
  };
  sessions: SessionInfo[];
  security: SecurityStatus;
}

const copy = {
  vi: {
    back: 'Trở lại Bảng điều khiển',
    title: 'Tài khoản của bạn',
    userId: 'ID',
    joined: 'Tham gia',
    totalTrades: 'Tổng lệnh GD',
    assetTypes: 'Khác biệt loại tài sản',
    importSources: 'Nguồn import',
    noData: 'Chưa có dữ liệu',
    latestTrade: 'Giao dịch mới nhất',
    noDate: 'Chưa có dữ liệu',
    language: 'Ngôn ngữ',
    vi: 'VI',
    en: 'EN',
    activeSessions: 'Phiên đăng nhập đang hoạt động',
    sessionCount: 'thiết bị',
    lastActive: 'Hoạt động cuối',
    signOutAll: 'Đăng xuất tất cả thiết bị',
    signOutConfirm: 'Bạn có chắc muốn đăng xuất khỏi tất cả thiết bị?',
    signOutDevice: 'Đăng xuất thiết bị này',
    desktop: 'Máy tính',
    mobile: 'Di động',
    unknown: 'Không xác định',
    securityStatus: 'Tình trạng bảo mật',
    failedAttempts: 'Lần đăng nhập thất bại (15 phút)',
    accountLocked: 'Tài khoản bị khóa',
    lockedUntil: 'Khóa đến',
    notLocked: 'Không bị khóa',
    signOutSuccess: 'Đã đăng xuất khỏi thiết bị',
    signOutAllSuccess: 'Đã đăng xuất khỏi tất cả thiết bị',
    signOutAllError: 'Không thể đăng xuất',
  },
  en: {
    back: 'Back to Dashboard',
    title: 'Your Account',
    userId: 'ID',
    joined: 'Joined',
    totalTrades: 'Total Trades',
    assetTypes: 'Distinct Asset Types',
    importSources: 'Import Sources',
    noData: 'No data yet',
    latestTrade: 'Latest Transaction',
    noDate: 'No data available',
    language: 'Language',
    vi: 'VI',
    en: 'EN',
    activeSessions: 'Active Sessions',
    sessionCount: 'devices',
    lastActive: 'Last active',
    signOutAll: 'Sign out all devices',
    signOutConfirm: 'Are you sure you want to sign out from all devices?',
    signOutDevice: 'Sign out this device',
    desktop: 'Desktop',
    mobile: 'Mobile',
    unknown: 'Unknown',
    securityStatus: 'Security Status',
    failedAttempts: 'Failed attempts (15 min)',
    accountLocked: 'Account Locked',
    lockedUntil: 'Locked until',
    notLocked: 'Not locked',
    signOutSuccess: 'Device signed out',
    signOutAllSuccess: 'All devices signed out',
    signOutAllError: 'Cannot sign out',
  },
} satisfies Record<DashboardLanguage, Record<string, string>>;

export default function AccountClient({ summary }: { summary: AccountSummary }) {
  const [language, setLanguage] = useState<DashboardLanguage>('vi');
  const [showCutoff, setShowCutoff] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>(summary.sessions);
  const [signingOutAll, setSigningOutAll] = useState(false);

  useEffect(() => {
    const storedLanguage = window.localStorage.getItem(DASHBOARD_LANGUAGE_STORAGE_KEY);
    if (storedLanguage === 'vi' || storedLanguage === 'en') {
      setLanguage(storedLanguage);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DASHBOARD_LANGUAGE_STORAGE_KEY, language);
  }, [language]);

  const t = copy[language];
  const locale = language === 'vi' ? 'vi-VN' : 'en-US';

  const formatDate = useMemo(() => (date: Date | string | null) => {
    if (!date) return t.noDate;
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(new Date(date));
  }, [locale, t.noDate]);

  const getDeviceIcon = (userAgent: string | null) => {
    if (!userAgent) return Globe;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return Smartphone;
    }
    return Monitor;
  };

  const getDeviceType = (userAgent: string | null): string => {
    if (!userAgent) return t.unknown;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return t.mobile;
    }
    return t.desktop;
  };

  const handleSignOutAll = async () => {
    if (!window.confirm(t.signOutConfirm)) return;

    setSigningOutAll(true);
    try {
      const { signOutAllDevicesAction } = await import('@/actions/auth');
      await signOutAllDevicesAction();
      setSessions([]);
      toast.success(t.signOutAllSuccess);
    } catch {
      toast.error(t.signOutAllError);
    } finally {
      setSigningOutAll(false);
    }
  };

  const handleSignOutDevice = async (sessionId: string) => {
    try {
      const { signOutDeviceAction } = await import('@/actions/auth');
      await signOutDeviceAction(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success(t.signOutSuccess);
    } catch {
      toast.error(t.signOutAllError);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto w-full max-w-[860px] space-y-8 px-4 py-8 sm:px-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              {t.back}
            </Link>
          </div>

          <div className="inline-flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-950/80 p-1 text-sm text-slate-300">
            <div className="flex items-center gap-2 px-3 text-slate-400">
              <Languages className="h-4 w-4" />
              <span>{t.language}</span>
            </div>
            <button type="button" onClick={() => setLanguage('vi')} className={language === 'vi' ? 'rounded-xl bg-blue-600 px-3 py-1.5 text-white' : 'rounded-xl px-3 py-1.5 text-slate-400 hover:bg-slate-900'}>{t.vi}</button>
            <button type="button" onClick={() => setLanguage('en')} className={language === 'en' ? 'rounded-xl bg-blue-600 px-3 py-1.5 text-white' : 'rounded-xl px-3 py-1.5 text-slate-400 hover:bg-slate-900'}>{t.en}</button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl shadow-black/20">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-900/20 transition-transform duration-700" />
          <div className="relative z-10 flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:text-left">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-inner">
              <UserCircle2 className="h-12 w-12" />
            </div>
            <div className="flex flex-col items-center sm:items-start">
              <h1 className="bg-gradient-to-r from-white to-slate-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">{t.title}</h1>
              <p className="mt-1 font-medium text-slate-400">{summary.user.email}</p>

              <div className="mt-4 flex w-full max-w-sm flex-col items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-2.5 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:flex-row">
                <span className="flex items-center gap-1 px-2 sm:border-r sm:border-slate-700">
                  <span>{t.userId}:</span>
                  <span className="w-24 truncate font-mono text-[10px] lowercase" title={summary.user.id}>{summary.user.id}</span>
                </span>
                <span className="flex items-center gap-1 px-2">
                  <span>{t.joined}:</span>
                  {new Date(summary.user.createdAt).toLocaleDateString(locale)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
              <Activity className="h-4 w-4 text-emerald-500" />
              {t.totalTrades}
            </div>
            <span className="text-3xl font-black text-white">{summary.transactionCount}</span>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
              <Filter className="h-4 w-4 text-orange-500" />
              {t.assetTypes}
            </div>
            <span className="text-3xl font-black text-white">{summary.distinctTickerCount}</span>
          </div>

          <div className="col-span-2 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm sm:col-span-1">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-400">
              <HardDrive className="h-4 w-4 text-blue-500" />
              {t.importSources}
            </div>
            {summary.sourceBreakdown.length > 0 ? (
              <div className="space-y-2">
                {summary.sourceBreakdown.map((source) => (
                  <div key={source.source} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-sm font-medium">
                    <span className="capitalize text-slate-300">{source.source}</span>
                    <span className="rounded border border-slate-800 bg-slate-900 px-2 py-0.5 font-bold text-white">{source.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="px-3 py-1.5 text-sm font-medium text-slate-500">{t.noData}</span>
            )}
          </div>

          <div className="col-span-2 flex flex-col justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm sm:col-span-1">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
              <Clock className="h-4 w-4 text-purple-500" />
              {t.latestTrade}
            </div>
            <span className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-center font-mono text-sm font-medium tracking-tight text-slate-300">
              {formatDate(summary.lastTransactionAt)}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-200">Cấu hình chốt sổ đầu kỳ / Cut-off Settings</h3>
              <p className="text-sm text-slate-400">Thiết lập nguồn vốn và ngày bắt đầu để engine tính toán.</p>
            </div>
            <button 
              onClick={() => setShowCutoff(!showCutoff)} 
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors whitespace-nowrap"
            >
              {showCutoff ? 'Đóng lại / Close' : 'Sửa đổi cấu hình chốt sổ / Edit'}
            </button>
          </div>
          {showCutoff && (
            <div className="mt-2 pt-6 border-t border-slate-800">
              <CutoffSetupForm initialSettings={summary.portfolioSettings} language={language} />
            </div>
          )}
        </div>
        <ImportHistoryCard batches={summary.importBatches} language={language} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/30">
                <Shield className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-200">{t.securityStatus}</h3>
                <p className="text-sm text-slate-400">{summary.security.totalSessions} {t.sessionCount}</p>
              </div>
            </div>
            {sessions.length > 0 && (
              <button
                onClick={handleSignOutAll}
                disabled={signingOutAll}
                className="px-4 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                {signingOutAll ? '...' : t.signOutAll}
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${summary.security.isLocked ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {summary.security.isLocked ? <AlertTriangle className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${summary.security.isLocked ? 'text-rose-400' : 'text-emerald-400'}`}>
                {summary.security.isLocked ? t.accountLocked : t.notLocked}
              </p>
              {summary.security.isLocked && summary.security.lockoutUntil && (
                <p className="text-xs text-slate-400">
                  {t.lockedUntil}: {formatDate(summary.security.lockoutUntil)}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">{t.failedAttempts}</p>
              <p className={`text-lg font-bold ${summary.security.failedAttemptsInWindow > 3 ? 'text-amber-400' : 'text-slate-300'}`}>
                {summary.security.failedAttemptsInWindow}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium text-slate-400">{t.activeSessions}</h4>
            {sessions.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">{t.noData}</p>
            ) : (
              sessions.map((session) => {
                const DeviceIcon = getDeviceIcon(session.userAgent);
                return (
                  <div key={session.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <DeviceIcon className="h-5 w-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-200">{getDeviceType(session.userAgent)}</p>
                        <p className="text-xs text-slate-500">
                          {session.ipAddress || 'Unknown IP'} • {t.lastActive}: {formatDate(session.lastUsedAt)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSignOutDevice(session.id)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-slate-700 transition-colors"
                      title={t.signOutDevice}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <ChangePasswordForm language={language} />
        <DeletePortfolioDataForm language={language} />
      </main>
    </div>
  );
}
