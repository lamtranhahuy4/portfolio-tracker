import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { snapshotDailyRates } from '@/lib/foreignExchangeService';

export const dynamic = 'force-dynamic';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await snapshotDailyRates();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Forex snapshot failed:', err);
    return NextResponse.json({ error: 'Snapshot failed' }, { status: 500 });
  }
}
