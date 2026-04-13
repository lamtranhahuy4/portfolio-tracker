'use server';

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { cookies } from 'next/headers';
import { getCurrentUser, setDbSession, hashValue, createDbSession } from '@/lib/auth';
import { db } from '@/db/index';
import { sessions } from '@/db/schema';
import { sql, gt } from 'drizzle-orm';

export async function GET() {
  const debug: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    step: 'starting',
  };

  try {
    // Step 0: Check cookies directly
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('portfolio_session');
    debug.cookies = {
      portfolio_session_found: !!sessionCookie,
      portfolio_session_length: sessionCookie?.value?.length || 0,
      portfolio_session_prefix: sessionCookie?.value?.substring(0, 30) + '...',
      all_cookie_names: cookieStore.getAll().map(c => c.name),
    };
    debug.step = 'cookies_checked';

    // Step 1: Check current user
    const user = await getCurrentUser();
    debug.currentUser = user ? { id: user.id, email: user.email } : null;
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
    debug.sampleSessions = sampleSessions.map(s => ({
      id: s.id,
      userId: s.userId,
      tokenHashPrefix: s.tokenHash?.substring(0, 10) + '...',
      expiresAt: s.expiresAt,
    }));
    debug.step = 'sessions_sampled';

    // Step 4: Test hash function
    const testValue = 'test_token_12345';
    const testHash = hashValue(testValue);
    debug.testHash = {
      input: testValue,
      outputLength: testHash.length,
      outputPrefix: testHash.substring(0, 10) + '...',
      isValidHex: /^[a-f0-9]{64}$/i.test(testHash),
    };
    debug.step = 'hash_tested';

    // Step 5: Environment info
    debug.env = {
      authSecretPrefix: process.env.AUTH_SECRET?.substring(0, 5) || 'NOT_SET',
      hasAuthSecret: !!process.env.AUTH_SECRET,
      nodeEnv: process.env.NODE_ENV,
    };
    debug.step = 'env_checked';

    return NextResponse.json(debug);
  } catch (error) {
    debug.error = error instanceof Error ? error.message : String(error);
    debug.stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(debug, { status: 500 });
  }
}

export async function POST() {
  const debug: Record<string, unknown> = { timestamp: new Date().toISOString() };

  try {
    // Create a test session
    const testUserId = '00000000-0000-0000-0000-000000000001'; // Test UUID
    
    debug.step = 'creating_session';
    const token = await createDbSession(testUserId, 'Debug Endpoint', '127.0.0.1');
    
    debug.createdToken = {
      length: token.length,
      prefix: token.substring(0, 20) + '...',
      containsUnderscore: token.includes('_'),
      sampleTokenHash: hashValue(token).substring(0, 20) + '...',
    };
    debug.step = 'session_created';

    // Verify the session was inserted
    const tokenHash = hashValue(token);
    const insertedSessions = await db
      .select({ id: sessions.id, tokenHash: sessions.tokenHash })
      .from(sessions)
      .where(sql`${sessions.tokenHash} = ${tokenHash}`)
      .limit(1);
    
    debug.insertedSession = {
      found: insertedSessions.length > 0,
      tokenHashMatch: insertedSessions[0]?.tokenHash === tokenHash,
      storedTokenHash: insertedSessions[0]?.tokenHash?.substring(0, 20) + '...',
    };
    debug.step = 'session_verified';

    return NextResponse.json(debug);
  } catch (error) {
    debug.error = error instanceof Error ? error.message : String(error);
    debug.stack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(debug, { status: 500 });
  }
}
