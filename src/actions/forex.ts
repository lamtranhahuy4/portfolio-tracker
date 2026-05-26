'use server';

import { snapshotDailyRates } from '@/lib/foreignExchangeService';

export const triggerForexSnapshot = snapshotDailyRates;
