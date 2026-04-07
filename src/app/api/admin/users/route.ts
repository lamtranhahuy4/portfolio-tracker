import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/db/index';
import { users, sessions } from '@/db/schema';
import { hashPassword } from '@/lib/auth';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

function verifyAdminSecret(request: Request): boolean {
  if (!ADMIN_SECRET) {
    return false;
  }
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${ADMIN_SECRET}`;
}

export async function GET(request: Request) {
  if (!verifyAdminSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);

    const usersWithSessionCount = await Promise.all(
      allUsers.map(async (user) => {
        const activeSessions = await db
          .select({ count: users.id })
          .from(sessions)
          .where(eq(sessions.userId, user.id));
        
        return {
          ...user,
          activeSessions: activeSessions.length,
        };
      })
    );

    return NextResponse.json({
      users: usersWithSessionCount,
      total: usersWithSessionCount.length,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
