'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { setManualPrice } from '@/lib/priceService';

export async function setManualPriceAction(
  ticker: string,
  price: number,
  assetClass?: string
) {
  const user = await requireUser();
  await setManualPrice(ticker, price, assetClass ?? 'STOCK', 'VND', 'manual-override', user.id);
  revalidatePath('/');
}
