import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db } from '@/db/index';
import { watchlist } from '@/db/schema';
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

    const items = await db
      .select()
      .from(watchlist)
      .where(eq(watchlist.userId, user.id))
      .orderBy(watchlist.createdAt);

    const response = NextResponse.json({ watchlist: items });
    addRateLimitHeaders(response, rateLimit.remaining, rateLimit.resetTime);
    return response;
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Watchlist GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch watchlist' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const { ticker, name, notes } = body;

    if (!ticker) {
      return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });
    }

    const upperTicker = ticker.toUpperCase().trim();
    
    const existing = await db
      .select()
      .from(watchlist)
      .where(and(
        eq(watchlist.userId, user.id),
        eq(watchlist.ticker, upperTicker)
      ))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Ticker already in watchlist' }, { status: 409 });
    }

    const [item] = await db
      .insert(watchlist)
      .values({
        userId: user.id,
        ticker: upperTicker,
        name: name || null,
        notes: notes || null,
      })
      .returning();

    return NextResponse.json({ watchlist: item }, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Watchlist POST error:', error);
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 });
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
      .delete(watchlist)
      .where(and(
        eq(watchlist.id, id),
        eq(watchlist.userId, user.id)
      ));

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Watchlist DELETE error:', error);
    return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 });
  }
}
