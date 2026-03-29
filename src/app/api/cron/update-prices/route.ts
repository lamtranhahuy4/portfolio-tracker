import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  // 1. Kiá»ƒm tra xÃ¡c thá»±c (Vercel Cron Secret)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Láº¥y toÃ n bá»™ transactions Ä‘á»ƒ tÃ¬m cÃ¡c asset duy nháº¥t
    const allTxs = await db.query.transactions.findMany();
    const uniqueAssets = Array.from(new Set(allTxs.map(tx => tx.asset)));

    if (uniqueAssets.length === 0) {
      return NextResponse.json({ success: true, message: "KhÃ´ng cÃ³ tÃ i sáº£n nÃ o Ä‘á»ƒ cáº­p nháº­t." });
    }

    // [REMOVED] Logic Ä‘Ã¨ price trá»±c tiáº¿p lÃªn lá»‹ch sá»­ giao dá»‹ch á»Ÿ Ä‘Ã¢y Ä‘Ã£ bá»‹ bá» theo yÃªu cáº§u P0
    // Äá»ƒ cÃ³ giÃ¡ thá»‹ trÆ°á»ng má»›i nháº¥t, tÆ°Æ¡ng lai sáº½ phÃ¡t triá»ƒn báº£ng Market Price riÃªng.

    return NextResponse.json({ success: true, message: "ÄÃ£ rÃ  soÃ¡t cron thÃ nh cÃ´ng (bá» qua update lá»‹ch sá»­ Ä‘á»ƒ báº£o toÃ n dá»¯ liá»‡u)!" });
  } catch (error: any) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

