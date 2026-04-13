import { NextResponse } from 'next/server';
import { calculateRealizedPnLWithTax } from '@/actions/portfolioSettings';
import { UnauthorizedError } from '@/lib/auth';

export async function GET() {
  try {
    const result = await calculateRealizedPnLWithTax();
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Tax calculation error:', error);
    return NextResponse.json({ error: 'Failed to calculate tax' }, { status: 500 });
  }
}