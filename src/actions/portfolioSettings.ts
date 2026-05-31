'use server';

import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db/index';
import { portfolioSettings, transactions } from '@/db/schema';
import { requireUser } from '@/lib/auth';

export interface TaxCalculationResult {
  ticker: string;
  totalQuantitySold: number;
  totalCostBasis: number;
  totalProceeds: number;
  grossProfit: number;
  taxAmount: number;
  netProfit: number;
}

export interface PortfolioTaxSummary {
  totalProceeds: number;
  totalCostBasis: number;
  totalGrossProfit: number;
  totalTaxAmount: number;
  totalNetProfit: number;
  taxRate: number;
  byTicker: TaxCalculationResult[];
}

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
    taxRate: settings?.taxRate ? Number(settings.taxRate) : 0.001,
  };
}

export async function saveTaxRate(taxRateRaw: number) {
  const user = await requireUser();
  const taxRate = Number(taxRateRaw);

  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) {
    throw new Error('Thuế suất không hợp lệ (0-100%).');
  }

  const [existing] = await db.select({ id: portfolioSettings.id })
    .from(portfolioSettings)
    .where(eq(portfolioSettings.userId, user.id))
    .limit(1);

  if (existing) {
    await db.update(portfolioSettings)
      .set({ taxRate: taxRate.toString(), updatedAt: new Date() })
      .where(eq(portfolioSettings.id, existing.id));
  } else {
    await db.insert(portfolioSettings).values({
      userId: user.id,
      taxRate: taxRate.toString(),
    });
  }

  revalidatePath('/account');
  return { taxRate };
}

export async function calculateRealizedPnLWithTax(): Promise<PortfolioTaxSummary> {
  const user = await requireUser();
  const settings = await fetchPortfolioSettings();
  const taxRate = settings.taxRate || 0.001;

  const allTransactions = await db.select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        eq(transactions.type, 'SELL')
      )
    )
    .orderBy(transactions.date);

  const tickerMap = new Map<string, {
    quantitySold: number;
    costBasis: number;
    proceeds: number;
  }>();

  for (const tx of allTransactions) {
    const quantity = Number(tx.amount);
    const price = Number(tx.price);
    const fee = Number(tx.fee);
    const tax = Number(tx.tax);
    
    const proceeds = (quantity * price) - fee - tax;
    const costBasis = quantity * price;

    const existing = tickerMap.get(tx.asset) || { quantitySold: 0, costBasis: 0, proceeds: 0 };
    existing.quantitySold += quantity;
    existing.costBasis += costBasis;
    existing.proceeds += proceeds;
    tickerMap.set(tx.asset, existing);
  }

  const byTicker: TaxCalculationResult[] = [];
  let totalProceeds = 0;
  let totalCostBasis = 0;
  let totalGrossProfit = 0;
  let totalTaxAmount = 0;
  let totalNetProfit = 0;

  for (const [ticker, data] of tickerMap) {
    const grossProfit = data.proceeds - data.costBasis;
    const taxAmount = grossProfit > 0 ? grossProfit * taxRate : 0;
    const netProfit = grossProfit - taxAmount;

    byTicker.push({
      ticker,
      totalQuantitySold: data.quantitySold,
      totalCostBasis: data.costBasis,
      totalProceeds: data.proceeds,
      grossProfit,
      taxAmount,
      netProfit,
    });

    totalProceeds += data.proceeds;
    totalCostBasis += data.costBasis;
    totalGrossProfit += grossProfit;
    totalTaxAmount += taxAmount;
    totalNetProfit += netProfit;
  }

  return {
    totalProceeds,
    totalCostBasis,
    totalGrossProfit,
    totalTaxAmount,
    totalNetProfit,
    taxRate,
    byTicker: byTicker.sort((a, b) => b.netProfit - a.netProfit),
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
