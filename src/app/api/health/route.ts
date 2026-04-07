import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: 'pass' | 'fail';
      latency?: number;
      error?: string;
    };
  };
}

export async function GET() {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    checks: {
      database: { status: 'pass' },
    },
  };

  try {
    const dbStartTime = Date.now();
    await db.execute(sql`SELECT 1`);
    const dbLatency = Date.now() - dbStartTime;

    health.checks.database = {
      status: 'pass',
      latency: dbLatency,
    };

    if (dbLatency > 1000) {
      health.status = 'degraded';
    }
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.database = {
      status: 'fail',
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }

  const totalLatency = Date.now() - startTime;
  if (totalLatency > 5000) {
    health.status = 'degraded';
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, {
    status: statusCode,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Health-Status': health.status,
    },
  });
}
