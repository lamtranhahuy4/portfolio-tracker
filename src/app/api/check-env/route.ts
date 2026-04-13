import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasAuthSecret: !!process.env.AUTH_SECRET,
    authSecretPrefix: process.env.AUTH_SECRET?.substring(0, 5) || 'NOT_SET',
    nodeEnv: process.env.NODE_ENV,
  });
}
