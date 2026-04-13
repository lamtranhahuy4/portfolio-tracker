import { NextResponse } from 'next/server';
import { hashValue } from '@/lib/auth';

export async function GET() {
  const authSecret = process.env.AUTH_SECRET ?? 'NOT_SET';
  const hash = hashValue('test_token');
  
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    authSecretSet: !!process.env.AUTH_SECRET,
    authSecretLength: authSecret.length,
    testHash: hash.substring(0, 20) + '...',
  });
}
