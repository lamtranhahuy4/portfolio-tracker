import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db/index';
import { users } from '@/db/schema';
import { hashPassword, invalidateAllSessionsForUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/apiRateLimiter';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    let result = a.length ^ b.length;
    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
  try {
    const buf = Buffer.from(a, 'utf8');
    const expected = Buffer.from(b, 'utf8');
    return buf.length === expected.length && timingSafeEqual(buf, expected);
  } catch {
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }
}

function verifyAdminSecret(request: Request): boolean {
  if (!ADMIN_SECRET) {
    console.error('ADMIN_SECRET is not set');
    return false;
  }
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  return constantTimeCompare(token, ADMIN_SECRET);
}

interface ResetRequest {
  email: string;
  newPassword: string;
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  const rateCheck = checkRateLimit(`admin-reset:${ip}`);
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  if (!verifyAdminSecret(request)) {
    console.warn(`[ADMIN] Failed reset attempt from IP ${ip}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: ResetRequest = await request.json();
    
    if (!body.email || !body.newPassword) {
      return NextResponse.json(
        { error: 'Email and newPassword are required' },
        { status: 400 }
      );
    }

    if (body.newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const normalizedEmail = body.email.trim().toLowerCase();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newPasswordHash = hashPassword(body.newPassword);

    await db.update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.id, user.id));

    await invalidateAllSessionsForUser(user.id);

    console.log(`[ADMIN] Password reset for ${normalizedEmail} from IP ${ip}`);

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('[ADMIN] Error resetting password:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
