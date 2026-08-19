import { inngest } from "./client";
import { db } from "@/db";
import { marketPrices } from "@/db/schema";
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
      const existingPrices = await db.select({ ticker: marketPrices.ticker }).from(marketPrices);
      return [...new Set(existingPrices.map(p => p.ticker))];
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
