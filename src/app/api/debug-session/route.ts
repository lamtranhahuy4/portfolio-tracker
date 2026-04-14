'use server';

import { NextResponse } from 'next/server';
import { getCurrentUser, hashValue } from '@/lib/auth';
import { db } from '@/db/index';
import { sessions } from '@/db/schema';
import { sql, gt } from 'drizzle-orm';
import { canUseDebugRoutes } from '@/lib/debugAccess';

export async function GET(request: Request) {
  if (!canUseDebugRoutes(request)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const debug: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    step: 'starting',
  };

  try {
    // Step 1: Check current user
    const user = await getCurrentUser();
    debug.currentUserAuthenticated = !!user;
    debug.step = 'user_checked';

    // Step 2: Get all sessions count
    const sessionCount = await db.select({ count: sql<number>`count(*)` }).from(sessions);
    debug.totalSessions = sessionCount[0]?.count;
    debug.step = 'session_counted';

    // Step 3: Get sample sessions
    const sampleSessions = await db
      .select({ id: sessions.id, userId: sessions.userId, tokenHash: sessions.tokenHash, expiresAt: sessions.expiresAt })
      .from(sessions)
      .where(gt(sessions.expiresAt, new Date()))
      .limit(3);
    debug.activeSessionSampleCount = sampleSessions.length;
    debug.step = 'sessions_sampled';

    // Step 4: Test hash function
    const testValue = 'test_token_12345';
    const testHash = hashValue(testValue);
    debug.testHash = {
      outputLength: testHash.length,
      isValidHex: /^[a-f0-9]{64}$/i.test(testHash),
    };
    debug.step = 'hash_tested';

    // Step 5: Environment info
    debug.env = {
      hasAuthSecret: !!process.env.AUTH_SECRET,
      hasAdminSecret: !!process.env.ADMIN_SECRET,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      debugRoutesEnabled: process.env.ENABLE_DEBUG_ROUTES === 'true',
      nodeEnv: process.env.NODE_ENV,
    };
    debug.step = 'env_checked';

    return NextResponse.json(debug);
  } catch (error) {
    debug.error = error instanceof Error ? error.message : String(error);
    return NextResponse.json(debug, { status: 500 });
  }
}
