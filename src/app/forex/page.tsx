import { getForexRates } from '@/lib/foreignExchangeService';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ForexClient from './ForexClient';

export const dynamic = 'force-dynamic';

export default async function ForexPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  const initialData = await getForexRates();

  return <ForexClient initialData={initialData} />;
}
