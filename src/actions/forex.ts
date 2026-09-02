'use server';

import { requireUser } from '@/lib/auth';
import { withErrorHandler } from '@/lib/errorHandler';
import { snapshotDailyRates } from '@/lib/foreignExchangeService';

export const triggerForexSnapshot = withErrorHandler(
  async function triggerForexSnapshot(): Promise<{ success: boolean; count: number }> {
    await requireUser();
    const count = await snapshotDailyRates();
    return { success: true, count };
  }
);
