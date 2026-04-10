'use server';

import { eq, count, max, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { fetchImportBatches } from '@/actions/importBatch';
import { fetchPortfolioSettings } from '@/actions/portfolioSettings';
import { db } from '@/db/index';
import { users, transactions, cashLedgerEvents, openingPositions } from '@/db/schema';
import { requireUser, hashPassword, verifyPassword, getUserSessions } from '@/lib/auth';
import { authRateLimiter } from '@/lib/rateLimiter';

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}

export interface SecurityStatus {
  totalSessions: number;
  failedAttemptsInWindow: number;
  isLocked: boolean;
  lockoutReason: string | null;
  lockoutUntil: Date | null;
}

export async function getAccountSummary() {
  const user = await requireUser();

  const [stats] = await db.select({
    transactionCount: count(transactions.id),
    distinctTickerCount: sql<number>`count(distinct ${transactions.asset})`.mapWith(Number),
    lastTransactionAt: max(transactions.date),
  }).from(transactions).where(eq(transactions.userId, user.id));

  const sources = await db.select({
    source: transactions.source,
    count: count(transactions.id),
  }).from(transactions).where(eq(transactions.userId, user.id)).groupBy(transactions.source);

  const [userInfo] = await db.select({
    id: users.id,
    email: users.email,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.id, user.id));

  const userSessions = await getUserSessions(user.id);
  const failedAttempts = await authRateLimiter.getFailedAttempts(user.email);
  const lockoutInfo = await authRateLimiter.isEmailLocked(user.email);

  const importBatches = await fetchImportBatches();
  const portfolioSettings = await fetchPortfolioSettings();

  return {
    user: userInfo,
    transactionCount: Number(stats?.transactionCount ?? 0),
    distinctTickerCount: Number(stats?.distinctTickerCount ?? 0),
    lastTransactionAt: stats?.lastTransactionAt ?? null,
    sourceBreakdown: sources.map((s) => ({ source: s.source || 'manual', count: Number(s.count) })),
    importBatches,
    portfolioSettings,
    sessions: userSessions,
    security: {
      totalSessions: userSessions.length,
      failedAttemptsInWindow: failedAttempts,
      isLocked: lockoutInfo.isLocked,
      lockoutReason: lockoutInfo.reason ?? null,
      lockoutUntil: lockoutInfo.lockedUntil ?? null,
    },
  };
}

export async function changePasswordAction(currentPassword: string, newPassword: string, confirmPassword: string) {
  const user = await requireUser();

  if (newPassword !== confirmPassword) {
    throw new Error('Mật khẩu xác nhận không khớp.');
  }

  if (newPassword.length < 8) {
    throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự.');
  }

  const [dbUser] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id));

  if (!dbUser || !verifyPassword(currentPassword, dbUser.passwordHash)) {
    throw new Error('Mật khẩu hiện tại không đúng.');
  }

  if (verifyPassword(newPassword, dbUser.passwordHash)) {
    throw new Error('Mật khẩu mới không được trùng với mật khẩu cũ.');
  }

  const newHash = hashPassword(newPassword);

  await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));

  return { success: true, message: 'Đổi mật khẩu thành công.' };
}

export async function deleteMyTransactionsAction(confirmText: string) {
  const user = await requireUser();

  if (confirmText !== 'DELETE') {
    throw new Error('Chữ xác nhận không hợp lệ. Vui lòng nhập đúng chữ DELETE.');
  }

  await db.delete(transactions).where(eq(transactions.userId, user.id));
  await db.delete(cashLedgerEvents).where(eq(cashLedgerEvents.userId, user.id));
  await db.delete(openingPositions).where(eq(openingPositions.userId, user.id));

  revalidatePath('/');
  revalidatePath('/account');

  return { success: true, message: 'Đã xóa toàn bộ dữ liệu giao dịch của bạn.' };
}
