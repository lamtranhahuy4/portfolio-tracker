'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { setManualPrice } from '@/lib/priceService';
import { assetClassSchema, parseActionInput } from '@/lib/validation/actionSchemas';

const manualPriceSchema = z.object({
  ticker: z.string().trim().min(1).max(32),
  price: z.number().finite().positive().lt(1e12),
  assetClass: assetClassSchema.default('STOCK'),
});

/**
 * Overrides the shared `market_prices` row for a ticker, which affects every user.
 * Restricted to admins (ADMIN_EMAILS).
 */
export async function setManualPriceAction(
  ticker: string,
  price: number,
  assetClass?: string
) {
  const user = await requireAdmin();
  const input = parseActionInput(manualPriceSchema, { ticker, price, assetClass });
  await setManualPrice(input.ticker, input.price, input.assetClass, 'VND', 'manual-override', user.id);
  revalidatePath('/');
}
