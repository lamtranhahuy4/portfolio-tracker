'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { createHash, randomBytes } from 'crypto';
import { db } from '@/db/index';
import { users, passwordResets } from '@/db/schema';
import { clearSession, hashPassword, setDbSession, verifyPassword, getUserSessions, invalidateSession, invalidateAllSessionsForUser } from '@/lib/auth';
import { authRateLimiter } from '@/lib/rateLimiter';
import { ActionState } from '@/types/action';

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

async function getClientIP(): Promise<string> {
  const headersList = await headers();
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

async function getUserAgent(): Promise<string> {
  const headersList = await headers();
  return headersList.get('user-agent') ?? 'Unknown';
}

export async function signUpAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    
    const normalizedEmail = normalizeEmail(email);
    validateCredentials(normalizedEmail, password);

    const [existingUser] = await db.select({
      id: users.id,
    }).from(users).where(eq(users.email, normalizedEmail)).limit(1);

    if (existingUser) {
      return { error: 'Email này đã được sử dụng.' };
    }

    const [newUser] = await db.insert(users).values({
      email: normalizedEmail,
      passwordHash: hashPassword(password),
    }).returning({
      id: users.id,
    });

    const ipAddress = await getClientIP();
    const userAgent = await getUserAgent();

    await setDbSession(newUser.id, userAgent, ipAddress);
    await authRateLimiter.recordAttempt(normalizedEmail, true, ipAddress);

    revalidatePath('/');
    return { message: 'success' };
  } catch (error) {
    console.error('[AUTH] signUpAction error:', error);
    return { error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không mong muốn.' };
  }
}

export async function signInAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  console.log('[AUTH] signInAction: START');
  try {
    const email = String(formData.get('email') ?? '');
    const password = String(formData.get('password') ?? '');
    
    console.log('[AUTH] signInAction: email received:', email, 'password length:', password.length);
    
    const normalizedEmail = normalizeEmail(email);
    console.log('[AUTH] signInAction: normalized email:', normalizedEmail);
    
    validateCredentials(normalizedEmail, password);
    console.log('[AUTH] signInAction: credentials validated');

    const ipAddress = await getClientIP();
    const userAgent = await getUserAgent();
    console.log('[AUTH] signInAction: IP:', ipAddress);

    const emailLockout = await authRateLimiter.isEmailLocked(normalizedEmail);
    console.log('[AUTH] signInAction: email lockout check:', emailLockout);
    if (emailLockout.isLocked) {
      const remainingMs = emailLockout.lockedUntil
        ? emailLockout.lockedUntil.getTime() - Date.now()
        : 0;
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      console.log('[AUTH] signInAction: email locked, returning error');
      return { error: `Tài khoản bị khóa tạm thời. Vui lòng thử lại sau ${remainingMinutes} phút.` };
    }

    const ipLockout = await authRateLimiter.isIpLocked(ipAddress);
    console.log('[AUTH] signInAction: ip lockout check:', ipLockout);
    if (ipLockout.isLocked) {
      const remainingMs = ipLockout.lockedUntil
        ? ipLockout.lockedUntil.getTime() - Date.now()
        : 0;
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      console.log('[AUTH] signInAction: ip locked, returning error');
      return { error: `Địa chỉ IP bị khóa tạm thời. Vui lòng thử lại sau ${remainingMinutes} phút.` };
    }

    console.log('[AUTH] signInAction: Looking up user:', normalizedEmail);
    const [user] = await db.select({
      id: users.id,
      passwordHash: users.passwordHash,
    }).from(users).where(eq(users.email, normalizedEmail)).limit(1);

    console.log('[AUTH] signInAction: User lookup result:', !!user, user?.id);
    
    if (!user) {
      console.log('[AUTH] signInAction: User not found, returning error');
      return { error: 'Email hoặc mật khẩu không đúng.' };
    }
    
    const passwordValid = verifyPassword(password, user.passwordHash);
    console.log('[AUTH] signInAction: Password valid:', passwordValid);
    
    if (!passwordValid) {
      console.log('[AUTH] signInAction: Invalid password, recording attempt');
      await authRateLimiter.recordAttempt(normalizedEmail, false, ipAddress);

      const lockResult = await authRateLimiter.checkAndLock(normalizedEmail, ipAddress);
      if (lockResult.locked) {
        console.log('[AUTH] signInAction: Account locked, returning error');
        return { error: 'Đăng nhập thất bại quá nhiều lần. Tài khoản và IP đã bị khóa tạm thời trong 15 phút.' };
      }

      const attemptsLeft = lockResult.maxAttempts - lockResult.attempts;
      console.log('[AUTH] signInAction: Invalid password, returning error with attempts left:', attemptsLeft);
      return { error: `Email hoặc mật khẩu không đúng. Còn ${attemptsLeft} lần thử.` };
    }

    console.log('[AUTH] signInAction: Creating session for user:', user.id);
    await setDbSession(user.id, userAgent, ipAddress);
    console.log('[AUTH] signInAction: Session created, recording attempt');
    await authRateLimiter.recordAttempt(normalizedEmail, true, ipAddress);
    console.log('[AUTH] signInAction: SUCCESS, revalidating path');

    revalidatePath('/');
    return { message: 'success' };
  } catch (error) {
    console.error('[AUTH] signInAction: CATCH BLOCK - error:', error);
    return { error: error instanceof Error ? error.message : 'Đã xảy ra lỗi không mong muốn.' };
  }
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

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function generateResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return { token, tokenHash };
}

function getResetTokenExpiry(): Date {
  return new Date(Date.now() + RESET_TOKEN_TTL_MS);
}

export async function requestPasswordResetAction(email: string) {
  const normalizedEmail = normalizeEmail(email);
  
  if (!normalizedEmail) {
    throw new Error('Email là bắt buộc.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error('Định dạng email không hợp lệ.');
  }

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user) {
    return { success: true, message: 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.' };
  }

  await db.delete(passwordResets)
    .where(eq(passwordResets.email, normalizedEmail));

  const { token, tokenHash } = generateResetToken();
  const expiresAt = getResetTokenExpiry();

  await db.insert(passwordResets).values({
    email: normalizedEmail,
    tokenHash,
    expiresAt,
  });

  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(normalizedEmail)}`;
  
  if (process.env.NODE_ENV !== 'production') {
    console.info(`
╔═══════════════════════════════════════════════════════════════╗
║              PASSWORD RESET LINK (DEV ONLY)                   ║
╠═══════════════════════════════════════════════════════════════╣
║ Email: ${normalizedEmail.padEnd(48)}║
║ Token: ${token.substring(0, 48).padEnd(48)}║
║ URL:   ${resetUrl.substring(0, 48).padEnd(48)}║
╚═══════════════════════════════════════════════════════════════╝
`);
  }

  return { 
    success: true, 
    message: 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.',
    devPreview: process.env.NODE_ENV !== 'production' ? resetUrl : undefined
  };
}

export async function resetPasswordAction(token: string, email: string, newPassword: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!token || !normalizedEmail || !newPassword) {
    throw new Error('Token, email và mật khẩu mới là bắt buộc.');
  }

  if (newPassword.length < 8) {
    throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự.');
  }

  const tokenHash = createHash('sha256').update(token).digest('hex');

  const [resetRecord] = await db
    .select()
    .from(passwordResets)
    .where(
      and(
        eq(passwordResets.email, normalizedEmail),
        eq(passwordResets.tokenHash, tokenHash),
        gt(passwordResets.expiresAt, new Date()),
        isNull(passwordResets.usedAt)
      )
    )
    .limit(1);

  if (!resetRecord) {
    throw new Error('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (!user) {
    throw new Error('Không tìm thấy người dùng.');
  }

  await db.update(users)
    .set({ passwordHash: hashPassword(newPassword) })
    .where(eq(users.id, user.id));

  await db.update(passwordResets)
    .set({ usedAt: new Date() })
    .where(eq(passwordResets.id, resetRecord.id));

  await invalidateAllSessionsForUser(user.id);

  console.info(`Password reset successful for user: ${normalizedEmail}`);

  return { success: true, message: 'Mật khẩu đã được đặt lại thành công.' };
}
