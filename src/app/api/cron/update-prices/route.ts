import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { marketPrices } from '@/db/schema';
import { getRealtimeQuotes } from '@/lib/marketData';
import { cachePrice } from '@/lib/priceService';

export const dynamic = 'force-dynamic';

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
    const existingPrices = await db.select({ ticker: marketPrices.ticker }).from(marketPrices);
    const uniqueTickers = [...new Set(existingPrices.map(p => p.ticker))];
    
    let updatedCount = 0;
    
    if (uniqueTickers.length > 0) {
      const freshPrices = await getRealtimeQuotes(uniqueTickers);
      
      for (const ticker of uniqueTickers) {
        const price = freshPrices[ticker];
        if (price !== undefined) {
          // Assume STOCK/VND for standard quotes fetching
          await cachePrice(ticker, price, 'STOCK', 'VND', 'CRON_JOB');
          updatedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cron job chạy thành công. Đã cập nhật giá mới cho ${updatedCount} mã tài sản.`,
      updatedTickersCount: updatedCount,
    });
  } catch (error) {
    console.error('Cron job update-prices failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
