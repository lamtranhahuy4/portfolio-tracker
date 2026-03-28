import { fetchTransactions } from '@/actions/transaction';
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
  try {
    initialTransactions = await fetchTransactions();
  } catch (error) {
    console.error('Failed to load transactions for current user.', error);
  }

  return (
    <>
      <StoreInitializer initialTransactions={initialTransactions} />
      <DashboardClient userEmail={user.email} />
    </>
  );
}

