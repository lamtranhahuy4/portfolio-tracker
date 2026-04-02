'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/index';
import { portfolioSettings } from '@/db/schema';
import { requireUser } from '@/lib/auth';

export async function fetchPortfolioSettings() {
  const user = await requireUser();
  const [settings] = await db.select()
    .from(portfolioSettings)
    .where(eq(portfolioSettings.userId, user.id))
    .limit(1);

  return {
    globalCutoffDate: settings?.globalCutoffDate ? new Date(settings.globalCutoffDate) : null,
    initialNetContributions: settings?.initialNetContributions ? Number(settings.initialNetContributions) : 0,
    initialCashBalance: settings?.initialCashBalance ? Number(settings.initialCashBalance) : 0,
    feeDebt: settings ? Number(settings.feeDebt) : 0,
  };
}

export async function saveFeeDebtSetting(feeDebtRaw: number) {
  const user = await requireUser();
  const feeDebt = Number(feeDebtRaw);

  if (!Number.isFinite(feeDebt) || feeDebt < 0) {
    throw new Error('Nợ phí không hợp lệ.');
  }

  const [existing] = await db.select({ id: portfolioSettings.id })
    .from(portfolioSettings)
    .where(eq(portfolioSettings.userId, user.id))
    .limit(1);

  if (existing) {
    await db.update(portfolioSettings)
      .set({ feeDebt: feeDebt.toString(), updatedAt: new Date() })
      .where(eq(portfolioSettings.id, existing.id));
  } else {
    await db.insert(portfolioSettings).values({
      userId: user.id,
      feeDebt: feeDebt.toString(),
    });
  }

  revalidatePath('/');

  return { feeDebt };
}

export async function saveCutoffSettings(payload: { globalCutoffDate: Date | null, initialNetContributions: number, initialCashBalance: number }) {
  const user = await requireUser();

  if (payload.initialNetContributions < 0 || payload.initialCashBalance < 0) {
    throw new Error('Số dư đầu kỳ không hợp lệ.');
  }

  const [existing] = await db.select({ id: portfolioSettings.id })
    .from(portfolioSettings)
    .where(eq(portfolioSettings.userId, user.id))
    .limit(1);

  if (existing) {
    await db.update(portfolioSettings)
      .set({ 
        globalCutoffDate: payload.globalCutoffDate,
        initialNetContributions: payload.initialNetContributions.toString(),
        initialCashBalance: payload.initialCashBalance.toString(),
        updatedAt: new Date() 
      })
      .where(eq(portfolioSettings.id, existing.id));
  } else {
    await db.insert(portfolioSettings).values({
      userId: user.id,
      globalCutoffDate: payload.globalCutoffDate,
      initialNetContributions: payload.initialNetContributions.toString(),
      initialCashBalance: payload.initialCashBalance.toString(),
    });
  }

  revalidatePath('/');
  revalidatePath('/account');

  return { success: true };
}
