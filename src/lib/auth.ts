import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/db/index';
import { sessions, users } from '@/db/schema';

const SESSION_COOKIE = 'portfolio_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[AUTH] CRITICAL: AUTH_SECRET environment variable is not set. This is required for production deployments.');
    }
    console.warn('[AUTH] AUTH_SECRET not set, using fallback for development only');
    return process.env.DATABASE_URL 
      ? createHmac('sha256', process.env.DATABASE_URL).update('portfolio-tracker').digest('hex')
      : 'dev-only-auth-secret-not-for-production';
  }
  return secret;
}

export function hashValue(value: string) {
  return createHmac('sha256', getAuthSecret()).update(value).digest('hex');
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedHash] = passwordHash.split(':');
  if (!salt || !storedHash) return false;

  const computedHash = scryptSync(password, salt, 64).toString('hex');
  return timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(computedHash, 'hex'));
}

function createToken(): { token: string; tokenHash: string } {
  const randomPart = randomBytes(32).toString('hex');
  const timestamp = Date.now().toString(36);
  const token = `${randomPart}_${timestamp}`;
  const tokenHash = hashValue(token);
  return { token, tokenHash };
}

export interface SessionInfo {
  id: string;
  userId: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  lastUsedAt: Date;
  expiresAt: Date;
}

export async function createDbSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const { token, tokenHash } = createToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
    userAgent: userAgent ?? null,
    ipAddress: ipAddress ?? null,
  });

  return token;
}

export async function validateDbSession(token: string): Promise<SessionInfo | null> {
  const tokenHash = hashValue(token);

  const [session] = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!session) return null;

  await db
    .update(sessions)
    .set({ lastUsedAt: new Date() })
    .where(eq(sessions.id, session.id));

  return {
    id: session.id,
    userId: session.userId,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    createdAt: new Date(session.createdAt),
    lastUsedAt: new Date(session.lastUsedAt),
    expiresAt: new Date(session.expiresAt),
  };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function invalidateAllSessionsForUser(userId: string): Promise<number> {
  const result = await db.delete(sessions).where(eq(sessions.userId, userId));
  return result.rowCount ?? 0;
}

export async function getUserSessions(userId: string): Promise<SessionInfo[]> {
  const userSessions = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        gt(sessions.expiresAt, new Date())
      )
    )
    .orderBy(sessions.lastUsedAt);

  return userSessions.map((session) => ({
    id: session.id,
    userId: session.userId,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    createdAt: new Date(session.createdAt),
    lastUsedAt: new Date(session.lastUsedAt),
    expiresAt: new Date(session.expiresAt),
  }));
}

export async function cleanupExpiredSessions(): Promise<number> {
  const result = await db
    .delete(sessions)
    .where(sql`${sessions.expiresAt} < NOW()`);

  return result.rowCount ?? 0;
}

export async function setDbSession(userId: string, userAgent?: string, ipAddress?: string) {
  const token = await createDbSession(userId, userAgent, ipAddress);
  
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function clearDbSession(sessionId?: string) {
  if (sessionId) {
    await invalidateSession(sessionId);
  }
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    if (!token) return null;

    const session = await validateDbSession(token);
    if (session) {
      const [user] = await db
        .select({
          id: users.id,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);
      return user ?? null;
    }
    return null;
  } catch (error) {
    console.error('[AUTH] Error in getCurrentUser:', error);
    return null;
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}

export function getClientInfo() {
  return {
    userAgent: 'Unknown',
    ipAddress: 'Unknown',
  };
}