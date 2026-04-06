'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db/index';
import { users } from '@/db/schema';
import { clearSession, clearDbSession, hashPassword, setDbSession, verifyPassword, getUserSessions, invalidateSession, invalidateAllSessionsForUser, getClientInfo } from '@/lib/auth';
import { authRateLimiter } from '@/lib/rateLimiter';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateCredentials(email: string, password: string) {
  if (!email || !password) {
    throw new Error('Email và mật khẩu là bắt buộc.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Định dạng email không hợp lệ.');
  }

  if (password.length < 8) {
    throw new Error('Mật khẩu phải có ít nhất 8 ký tự.');
  }
}

function getClientIP(): string {
  const headersList = headers();
  const forwarded = headersList.get('x-forwarded-for');
  const realIP = headersList.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return '127.0.0.1';
}

function getUserAgent(): string {
  const headersList = headers();
  return headersList.get('user-agent') ?? 'Unknown';
}

export async function signUpAction(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  validateCredentials(normalizedEmail, password);

  const [existingUser] = await db.select({
    id: users.id,
  }).from(users).where(eq(users.email, normalizedEmail)).limit(1);

  if (existingUser) {
    throw new Error('Email này đã được sử dụng.');
  }

  const [newUser] = await db.insert(users).values({
    email: normalizedEmail,
    passwordHash: hashPassword(password),
  }).returning({
    id: users.id,
  });

  const ipAddress = getClientIP();
  const userAgent = getUserAgent();

  await setDbSession(newUser.id, userAgent, ipAddress);
  await authRateLimiter.recordAttempt(normalizedEmail, true, ipAddress);

  revalidatePath('/');
}

export async function signInAction(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  validateCredentials(normalizedEmail, password);

  const ipAddress = getClientIP();
  const userAgent = getUserAgent();

  const emailLockout = await authRateLimiter.isEmailLocked(normalizedEmail);
  if (emailLockout.isLocked) {
    const remainingMs = emailLockout.lockedUntil
      ? emailLockout.lockedUntil.getTime() - Date.now()
      : 0;
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    throw new Error(`Tài khoản bị khóa tạm thời. Vui lòng thử lại sau ${remainingMinutes} phút.`);
  }

  const ipLockout = await authRateLimiter.isIpLocked(ipAddress);
  if (ipLockout.isLocked) {
    const remainingMs = ipLockout.lockedUntil
      ? ipLockout.lockedUntil.getTime() - Date.now()
      : 0;
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    throw new Error(`Địa chỉ IP bị khóa tạm thời. Vui lòng thử lại sau ${remainingMinutes} phút.`);
  }

  const [user] = await db.select({
    id: users.id,
    passwordHash: users.passwordHash,
  }).from(users).where(eq(users.email, normalizedEmail)).limit(1);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    await authRateLimiter.recordAttempt(normalizedEmail, false, ipAddress);

    const lockResult = await authRateLimiter.checkAndLock(normalizedEmail, ipAddress);
    if (lockResult.locked) {
      throw new Error('Đăng nhập thất bại quá nhiều lần. Tài khoản và IP đã bị khóa tạm thời trong 15 phút.');
    }

    const attemptsLeft = lockResult.maxAttempts - lockResult.attempts;
    throw new Error(`Email hoặc mật khẩu không đúng. Còn ${attemptsLeft} lần thử.`);
  }

  await setDbSession(user.id, userAgent, ipAddress);
  await authRateLimiter.recordAttempt(normalizedEmail, true, ipAddress);

  revalidatePath('/');
}

export async function signOutAction() {
  await clearSession();
  revalidatePath('/');
}

export async function signOutAllDevicesAction() {
  const { requireUser } = await import('@/lib/auth');
  const user = await requireUser();

  const invalidatedCount = await invalidateAllSessionsForUser(user.id);
  await clearSession();

  revalidatePath('/');

  return {
    success: true,
    invalidatedSessions: invalidatedCount,
  };
}

export async function signOutDeviceAction(sessionId: string) {
  await invalidateSession(sessionId);
  revalidatePath('/account');

  return { success: true };
}

export async function getLoginHistoryAction() {
  const { requireUser } = await import('@/lib/auth');
  const user = await requireUser();

  const sessions = await getUserSessions(user.id);

  return {
    sessions: sessions.map((session) => ({
      id: session.id,
      userAgent: session.userAgent ?? 'Unknown',
      ipAddress: session.ipAddress ?? 'Unknown',
      createdAt: session.createdAt.toISOString(),
      lastUsedAt: session.lastUsedAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    })),
    totalSessions: sessions.length,
  };
}

export async function getSecurityStatusAction() {
  const { requireUser } = await import('@/lib/auth');
  const user = await requireUser();

  const sessions = await getUserSessions(user.id);
  const failedAttempts = await authRateLimiter.getFailedAttempts(user.email);
  const lockoutInfo = await authRateLimiter.isEmailLocked(user.email);

  return {
    totalSessions: sessions.length,
    failedAttemptsInWindow: failedAttempts,
    isLocked: lockoutInfo.isLocked,
    lockoutReason: lockoutInfo.reason,
    lockoutUntil: lockoutInfo.lockedUntil?.toISOString(),
  };
}
