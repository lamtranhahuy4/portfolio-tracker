import { NextResponse } from 'next/server';
import { canUseDebugRoutes } from '@/lib/debugAccess';

export async function GET(request: Request) {
  if (!canUseDebugRoutes(request)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    hasAuthSecret: !!process.env.AUTH_SECRET,
    hasAdminSecret: !!process.env.ADMIN_SECRET,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    debugRoutesEnabled: process.env.ENABLE_DEBUG_ROUTES === 'true',
    nodeEnv: process.env.NODE_ENV,
  });
}
