import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/index';
import { priceAlerts } from '@/db/schema';
import { requireUser, UnauthorizedError } from '@/lib/auth';
import { addRateLimitHeaders, checkRateLimit, getRateLimitKey } from '@/lib/apiRateLimiter';

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const rateLimitKey = getRateLimitKey(request);
    const rateLimit = checkRateLimit(rateLimitKey, { maxRequests: 60, windowMs: 60000 });
    
    if (!rateLimit.allowed) {
      const response = NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime);
      return response;
    }

    const alerts = await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.userId, user.id))
      .orderBy(priceAlerts.createdAt);

    const response = NextResponse.json({ alerts });
    addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime);
    return response;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Price alerts GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { ticker, targetPrice, condition } = body;

    if (!ticker || !targetPrice || !condition) {
      return NextResponse.json({ error: 'Ticker, target price, and condition are required' }, { status: 400 });
    }

    if (condition !== 'above' && condition !== 'below') {
      return NextResponse.json({ error: 'Condition must be "above" or "below"' }, { status: 400 });
    }

    if (targetPrice <= 0) {
      return NextResponse.json({ error: 'Target price must be positive' }, { status: 400 });
    }

    const upperTicker = ticker.toUpperCase().trim();
    
    const [alert] = await db
      .insert(priceAlerts)
      .values({
        userId: user.id,
        ticker: upperTicker,
        targetPrice: targetPrice.toString(),
        condition,
        isActive: true,
        isTriggered: false,
      })
      .returning();

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Price alerts POST error:', error);
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await db
      .delete(priceAlerts)
      .where(and(
        eq(priceAlerts.id, id),
        eq(priceAlerts.userId, user.id)
      ));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Price alerts DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
  }
}
