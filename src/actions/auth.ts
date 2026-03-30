'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db/index';
import { users } from '@/db/schema';
import { clearSession, hashPassword, setSession, verifyPassword } from '@/lib/auth';

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateCredentials(email: string, password: string) {
  if (!email || !password) {
    throw new Error('Email và mật khẩu là bắt buộc.');
  }

  if (password.length < 8) {
    throw new Error('Mật khẩu phải có ít nhất 8 ký tự.');
  }
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

  await setSession(newUser.id);
  revalidatePath('/');
}

export async function signInAction(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  validateCredentials(normalizedEmail, password);

  const [user] = await db.select({
    id: users.id,
    passwordHash: users.passwordHash,
  }).from(users).where(eq(users.email, normalizedEmail)).limit(1);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error('Email hoặc mật khẩu không đúng.');
  }

  await setSession(user.id);
  revalidatePath('/');
}

export async function signOutAction() {
  await clearSession();
  revalidatePath('/');
}
