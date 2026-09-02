import { inngest } from "./client";
import { db } from "@/db";
import { marketPrices, transactions, openingPositions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getRealtimeQuotes } from "@/lib/marketData";
import { cachePrice } from "@/lib/priceService";
import { snapshotDailyRates } from "@/lib/foreignExchangeService";

export const updatePricesCron = inngest.createFunction(
  { 
    id: "update-prices-cron",
    triggers: [{ cron: "TZ=Asia/Ho_Chi_Minh 0 2 * * *" }] // Chạy lúc 2h sáng mỗi ngày
  },
  async ({ step }) => {
    // Bước 1: Lấy danh sách ticker từ database
    const uniqueTickers = await step.run("fetch-unique-tickers", async () => {
      const existingTxs = await db.select({ asset: transactions.asset }).from(transactions).where(eq(transactions.type, 'BUY'));
      const existingPos = await db.select({ asset: openingPositions.asset }).from(openingPositions);
      return [...new Set([...existingTxs.map(t => t.asset), ...existingPos.map(p => p.asset)])];
    });

    if (uniqueTickers.length === 0) {
      return { message: "No tickers found to update." };
    }

    // Bước 2: Chia nhỏ danh sách tickers thành các batch (mỗi batch 50 mã)
    const BATCH_SIZE = 50;
    const batches = [];
    for (let i = 0; i < uniqueTickers.length; i += BATCH_SIZE) {
      batches.push(uniqueTickers.slice(i, i + BATCH_SIZE));
    }

    let totalUpdated = 0;

    // Bước 3: Lặp qua từng batch, xử lý bằng step.run để Inngest tự retry và không bị timeout
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const updatedCount = await step.run(`update-batch-${i}`, async () => {
        const freshPrices = await getRealtimeQuotes(batch);
        let count = 0;
        
        for (const ticker of batch) {
          const price = freshPrices[ticker];
          if (price !== undefined) {
            await cachePrice(ticker, price, 'STOCK', 'VND', 'CRON_JOB');
            count++;
          }
        }
        return count;
      });
      totalUpdated += updatedCount;
    }

    return { success: true, totalUpdated, totalBatches: batches.length };
  }
);

export const forexSnapshotCron = inngest.createFunction(
  { 
    id: "forex-snapshot-cron",
    triggers: [{ cron: "TZ=Asia/Ho_Chi_Minh 5 2 * * *" }] // Chạy lúc 2h05 sáng
  },
  async ({ step }) => {
    await step.run("snapshot-daily-rates", async () => {
      await snapshotDailyRates();
    });
    return { success: true, message: "Forex daily snapshot recorded." };
  }
);

export const cleanupPricesCron = inngest.createFunction(
  {
    id: "cleanup-prices-cron",
    triggers: [{ cron: "TZ=Asia/Ho_Chi_Minh 0 3 * * *" }] // 3h sáng
  },
  async ({ step }) => {
    await step.run("cleanup-old-prices", async () => {
      const { sql } = await import("drizzle-orm");
      const { priceHistory } = await import("@/db/schema");
      
      await db.delete(priceHistory)
        .where(sql`${priceHistory.recordedAt} < NOW() - INTERVAL '90 days'`);
    });
    return { success: true, message: "Old price history cleaned up." };
  }
);
