import { NextResponse } from 'next/server';
import { db } from '@/db/index';
import { transactions } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  // 1. Kiểm tra xác thực (Vercel Cron Secret)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 2. Lấy toàn bộ transactions để tìm các asset duy nhất
    const allTxs = await db.query.transactions.findMany();
    const uniqueAssets = Array.from(new Set(allTxs.map(tx => tx.asset)));

    if (uniqueAssets.length === 0) {
      return NextResponse.json({ success: true, message: "Không có tài sản nào để cập nhật." });
    }

    // 3. Giả lập logic lấy giá API (VD: CoinGecko/Binance/yfinance) và cập nhật giá mới
    for (const assetName of uniqueAssets) {
      const currentAssetTxs = allTxs.filter(tx => tx.asset === assetName);
      if (currentAssetTxs.length === 0) continue;
      
      // Lấy giá price hiện tại làm tham chiếu
      const referencePrice = Number(currentAssetTxs[0].price);
      
      // Giả lập giá dao động ngẫu nhiên +- 5%
      const volatility = 0.05;
      const change = 1 + (Math.random() * volatility * 2 - volatility);
      const newPrice = referencePrice * change;

      // Cập nhật giá cho tất cả transactions của asset này bằng Drizzle (.env)
      await db.update(transactions)
        .set({ price: newPrice.toString() })
        .where(eq(transactions.asset, assetName));
    }

    return NextResponse.json({ success: true, message: "Đã cập nhật giá thị trường thành công!" });
  } catch (error: any) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
