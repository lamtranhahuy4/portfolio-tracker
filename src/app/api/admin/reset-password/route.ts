import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/index';
import { users } from '@/db/schema';
import { hashPassword, invalidateAllSessionsForUser } from '@/lib/auth';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function verifyAdminSecret(request: Request): boolean {
  if (!ADMIN_SECRET) {
    console.error('ADMIN_SECRET is not set');
    return false;
  }
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${ADMIN_SECRET}`;
}

interface ResetRequest {
  email: string;
  newPassword: string;
}

export async function POST(request: Request) {
  if (!verifyAdminSecret(request)) {
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

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
  }
}
