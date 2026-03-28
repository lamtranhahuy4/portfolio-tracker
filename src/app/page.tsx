import { fetchTransactions } from '@/actions/transaction';
import { fetchCashEvents } from '@/actions/cashLedger';
import AuthPanel from '@/components/AuthPanel';
import DashboardClient from '@/components/DashboardClient';
import StoreInitializer from '@/components/StoreInitializer';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return <AuthPanel />;
  }

  let initialTransactions = [];
  let initialCashEvents = [];
  try {
    initialTransactions = await fetchTransactions();
    initialCashEvents = await fetchCashEvents();
  } catch (error) {
    console.error('Failed to load portfolio data for current user.', error);
  }

  return (
    <>
      <StoreInitializer initialTransactions={initialTransactions} initialCashEvents={initialCashEvents} />
      <DashboardClient userEmail={user.email} />
    </>
  );
}

