import { NextResponse } from 'next/server';
import { snapshotDailyRates } from '@/lib/foreignExchangeService';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await snapshotDailyRates();
    return NextResponse.json({ success: true, message: 'Forex daily snapshot recorded.' });
  } catch (err) {
    console.error('Forex snapshot cron failed:', err);
    return NextResponse.json({ error: 'Snapshot failed' }, { status: 500 });
  }
}
