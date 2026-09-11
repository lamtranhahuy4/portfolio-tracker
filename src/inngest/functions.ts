import { inngest } from "./client";
import { db } from "@/db";
import { transactions, openingPositions } from "@/db/schema";
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


export const checkPriceAlertsCron = inngest.createFunction(
  {
    id: "check-price-alerts-cron",
    triggers: [{ cron: "TZ=Asia/Ho_Chi_Minh */30 9-14 * * 1-5" }] // M-F, 9:00 - 14:30
  },
  async ({ step }) => {
    // 1. Fetch active alerts
    const alertsToProcess = await step.run("fetch-active-alerts", async () => {
      const { priceAlerts, portfolioSettings } = await import("@/db/schema");
      const { eq, and } = await import("drizzle-orm");
      
      const activeAlerts = await db
        .select({
          id: priceAlerts.id,
          ticker: priceAlerts.ticker,
          targetPrice: priceAlerts.targetPrice,
          condition: priceAlerts.condition,
          telegramChatId: portfolioSettings.telegramChatId,
        })
        .from(priceAlerts)
        .leftJoin(portfolioSettings, eq(priceAlerts.userId, portfolioSettings.userId))
        .where(
          and(
            eq(priceAlerts.isActive, true),
            eq(priceAlerts.isTriggered, false)
          )
        );
        
      return activeAlerts.filter(a => !!a.telegramChatId);
    });

    if (alertsToProcess.length === 0) {
      return { success: true, message: "No active alerts with telegram chat IDs." };
    }

    // 2. Fetch realtime prices for these tickers
    const uniqueTickers = [...new Set(alertsToProcess.map(a => a.ticker))];
    const prices = await step.run("fetch-realtime-prices", async () => {
      return await getRealtimeQuotes(uniqueTickers as string[]);
    });

    // 3. Evaluate and notify
    const triggeredAlerts = await step.run("evaluate-and-notify", async () => {
      const { priceAlerts } = await import("@/db/schema");
      const { eq } = await import("drizzle-orm");
      let notifiedCount = 0;
      
      const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      if (!BOT_TOKEN) return 0;

      for (const alert of alertsToProcess) {
        const currentPrice = (prices as Record<string, number>)[alert.ticker];
        if (!currentPrice) continue;
        
        const target = Number(alert.targetPrice);
        let triggered = false;
        
        if (alert.condition === 'above' && currentPrice >= target) triggered = true;
        if (alert.condition === 'below' && currentPrice <= target) triggered = true;
        
        if (triggered) {
          // Send Telegram message
          const message = `🚨 CẢNH BÁO GIÁ: ${alert.ticker} \nGiá hiện tại: ${currentPrice} ₫ \nĐã ${alert.condition === 'above' ? 'vượt ngưỡng' : 'thủng ngưỡng'}: ${target} ₫`;
          
          try {
            const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: alert.telegramChatId, text: message })
            });
            
            if (res.ok) {
              // Mark as triggered
              await db.update(priceAlerts)
                .set({ isTriggered: true, isActive: false, triggeredAt: new Date() })
                .where(eq(priceAlerts.id, alert.id as string));
              notifiedCount++;
            }
          } catch (e) {
            console.error("Telegram error:", e);
          }
        }
      }
      return notifiedCount;
    });

    return { success: true, triggeredCount: triggeredAlerts };
  }
);
