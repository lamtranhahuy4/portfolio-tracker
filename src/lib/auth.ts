import { cookies } from 'next/headers';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/db/index';
import { sessions, users } from '@/db/schema';

const SESSION_COOKIE = 'portfolio_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.warn('[AUTH] AUTH_SECRET not set, using fallback based on DATABASE_URL');
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

function parseSessionToken(token: string | undefined) {
  if (!token) return null;
  
  if (token.includes('_')) {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  
  const [userId, expiresAt, signature] = parts;
  if (!userId || !expiresAt || !signature) return null;

  const payload = `${userId}.${expiresAt}`;
  const expectedBuffer = Buffer.from(hashValue(payload), 'hex');
  const signatureBuffer = Buffer.from(signature, 'hex');
  
  if (expectedBuffer.length !== signatureBuffer.length) return null;
  if (!timingSafeEqual(expectedBuffer, signatureBuffer)) return null;
  if (Number(expiresAt) < Date.now()) return null;

  return { userId };
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
  try {
    const { token, tokenHash } = createToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);

    console.log('[AUTH] createDbSession: token:', token.substring(0, 40) + '...');
    console.log('[AUTH] createDbSession: tokenHash:', tokenHash.substring(0, 20) + '...');
    console.log('[AUTH] createDbSession: tokenHash length:', tokenHash.length);
    
    await db.insert(sessions).values({
      userId,
      tokenHash,
      expiresAt,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    });
    
    console.log('[AUTH] createDbSession: Session inserted to DB successfully');
    return token;
  } catch (error) {
    console.error('[AUTH] createDbSession ERROR:', error instanceof Error ? error.message : error);
    throw error;
  }
}

export async function validateDbSession(token: string): Promise<SessionInfo | null> {
  console.log('[AUTH] validateDbSession: token length:', token?.length);
  console.log('[AUTH] validateDbSession: token prefix:', token?.substring(0, 20) + '...');
  
  const tokenHash = hashValue(token);
  console.log('[AUTH] validateDbSession: tokenHash length:', tokenHash.length);
  console.log('[AUTH] validateDbSession: tokenHash:', tokenHash.substring(0, 20) + '...');

  // Debug: Check if tokenHash is valid hex
  const isValidHex = /^[a-f0-9]{64}$/i.test(tokenHash);
  console.log('[AUTH] validateDbSession: tokenHash is valid 64-char hex:', isValidHex);

  // Debug: Count sessions in DB
  try {
    const allSessions = await db.select({ count: sql<number>`count(*)` }).from(sessions);
    console.log('[AUTH] validateDbSession: Total sessions in DB:', allSessions[0]?.count);
    
    // Debug: Check if any tokenHash matches
    const matchingSessions = await db
      .select({ id: sessions.id, tokenHash: sessions.tokenHash })
      .from(sessions)
      .where(gt(sessions.expiresAt, new Date()))
      .limit(5);
    console.log('[AUTH] validateDbSession: Sample sessions in DB:', matchingSessions.length);
    if (matchingSessions.length > 0) {
      console.log('[AUTH] validateDbSession: First stored tokenHash:', matchingSessions[0].tokenHash?.substring(0, 20) + '...');
      console.log('[AUTH] validateDbSession: Are they equal:', matchingSessions[0].tokenHash === tokenHash);
    }
  } catch (err) {
    console.error('[AUTH] validateDbSession: Debug query error:', err);
  }

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

  console.log('[AUTH] validateDbSession: Session found:', !!session);
  
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

export async function setSession(userId: string) {
  const randomPart = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + (SESSION_TTL_SECONDS * 1000);
  const payload = `${userId}.${expiresAt}`;
  const signature = hashValue(payload);
  const token = `${randomPart}_${payload}_${signature}`;
  
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function setDbSession(userId: string, userAgent?: string, ipAddress?: string) {
  try {
    console.log('[AUTH] setDbSession: Creating session for userId:', userId);
    const token = await createDbSession(userId, userAgent, ipAddress);
    console.log('[AUTH] setDbSession: Token created successfully, length:', token.length);
    
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_TTL_SECONDS,
    });
    console.log('[AUTH] setDbSession: Cookie set successfully');
  } catch (error) {
    console.error('[AUTH] setDbSession ERROR:', error instanceof Error ? error.message : error);
    throw error;
  }
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

    console.log('[AUTH] getCurrentUser: Cookie found:', !!token);
    console.log('[AUTH] getCurrentUser: Cookie value length:', token?.length || 0);
    console.log('[AUTH] getCurrentUser: Cookie value prefix:', token?.substring(0, 30) + '...');

    if (!token) return null;

    if (token.includes('_')) {
      console.log('[AUTH] getCurrentUser: Token contains underscore, using DB validation');
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
    }

    const session = parseSessionToken(token);
    if (!session) return null;

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    return user ?? null;
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
