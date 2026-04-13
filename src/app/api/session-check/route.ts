import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({
    isLoggedIn: !!user,
    userEmail: user?.email || null,
    userId: user?.id || null,
  });
}
