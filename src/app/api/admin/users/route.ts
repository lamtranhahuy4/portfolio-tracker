import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db/index';
import { users, sessions } from '@/db/schema';

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
    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
        activeSessions: sql<number>`COALESCE(COUNT(${sessions.id}), 0)::int`,
      })
      .from(users)
      .leftJoin(sessions, eq(sessions.userId, users.id))
      .groupBy(users.id)
      .orderBy(users.createdAt);

    return NextResponse.json({
      users: rows,
      total: rows.length,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
