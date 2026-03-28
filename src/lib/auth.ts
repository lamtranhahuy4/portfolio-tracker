import { cookies } from 'next/headers';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db/index';
import { users } from '@/db/schema';

const SESSION_COOKIE = 'portfolio_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function getAuthSecret() {
  return process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'dev-only-auth-secret';
}

function hashValue(value: string) {
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

function createSessionToken(userId: string) {
  const expiresAt = Date.now() + (SESSION_TTL_SECONDS * 1000);
  const payload = `${userId}.${expiresAt}`;
  const signature = hashValue(payload);
  return `${payload}.${signature}`;
}

function parseSessionToken(token: string | undefined) {
  if (!token) return null;

  const [userId, expiresAt, signature] = token.split('.');
  if (!userId || !expiresAt || !signature) return null;

  const payload = `${userId}.${expiresAt}`;
  if (hashValue(payload) !== signature) return null;
  if (Number(expiresAt) < Date.now()) return null;

  return { userId };
}

export async function setSession(userId: string) {
  cookies().set(SESSION_COOKIE, createSessionToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession() {
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = parseSessionToken(token);
  if (!session) return null;

  const [user] = await db.select({
    id: users.id,
    email: users.email,
  }).from(users).where(eq(users.id, session.userId)).limit(1);

  return user ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Bạn cần đăng nhập để truy cập dữ liệu danh mục.');
  }

  return user;
}
