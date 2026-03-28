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

    // [REMOVED] Logic đè price trực tiếp lên lịch sử giao dịch ở đây đã bị bỏ theo yêu cầu P0
    // Để có giá thị trường mới nhất, tương lai sẽ phát triển bảng Market Price riêng.
    console.log(`Cron runs but skips overriding transactions price. Unique assets found: ${uniqueAssets.length}`);

    return NextResponse.json({ success: true, message: "Đã rà soát cron thành công (bỏ qua update lịch sử để bảo toàn dữ liệu)!" });
  } catch (error: any) {
    console.error("Cron Job Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
