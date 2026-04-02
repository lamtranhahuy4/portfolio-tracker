import { fetchTransactions } from '@/actions/transaction';
import { fetchCashEvents } from '@/actions/cashLedger';
import { fetchOpeningPositionSnapshot } from '@/actions/openingPositions';
import { fetchPortfolioSettings } from '@/actions/portfolioSettings';
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
  let openingPositionSnapshot = { positions: [] };
  let portfolioSettings = { feeDebt: 0, globalCutoffDate: null as Date | null, initialNetContributions: 0, initialCashBalance: 0 };
  try {
    initialTransactions = await fetchTransactions();
    initialCashEvents = await fetchCashEvents();
    openingPositionSnapshot = await fetchOpeningPositionSnapshot();
    portfolioSettings = await fetchPortfolioSettings();
  } catch (error) {
    console.error('Failed to load portfolio data for current user.', error);
  }

  return (
    <>
      <StoreInitializer
        initialTransactions={initialTransactions}
        initialCashEvents={initialCashEvents}
        initialOpeningPositions={openingPositionSnapshot.positions}
        initialPortfolioSettings={portfolioSettings}
      />
      <DashboardClient userEmail={user.email} />
    </>
  );
}

