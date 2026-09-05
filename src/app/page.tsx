import { fetchTransactions } from '@/actions/transaction';
import { fetchCashEvents } from '@/actions/cashLedger';
import { fetchOpeningPositionSnapshot } from '@/actions/openingPositions';
import { fetchPortfolioSettings } from '@/actions/portfolioSettings';
import AuthPanel from '@/components/AuthPanel';
import DashboardClient from '@/components/DashboardClient';
import StoreInitializer from '@/components/StoreInitializer';
import { getCurrentUser } from '@/lib/auth';
import type { CashLedgerEvent, OpeningPositionSnapshot, Transaction } from '@/types/portfolio';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return <AuthPanel />;
  }

  let initialTransactions: Transaction[] = [];
  let initialCashEvents: CashLedgerEvent[] = [];
  let openingPositionSnapshot: OpeningPositionSnapshot = { positions: [] };
  let portfolioSettings: {
    feeDebt: number;
    globalCutoffDate: Date | null;
    initialNetContributions: number;
    initialCashBalance: number;
  } = { feeDebt: 0, globalCutoffDate: null, initialNetContributions: 0, initialCashBalance: 0 };
  let hasServerError = false;
  try {
    [initialTransactions, initialCashEvents, openingPositionSnapshot, portfolioSettings] = await Promise.all([
      fetchTransactions(),

      fetchCashEvents(),

      fetchOpeningPositionSnapshot(),

      fetchPortfolioSettings(),
    ]);
  } catch (error) {
    console.error('Failed to load portfolio data for current user.', error);
    hasServerError = true;
  }

  if (hasServerError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-rose-400">Server Error</h2>
          <p className="text-slate-400">Failed to load portfolio data. Please try again later.</p>
        </div>
      </div>
    );
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

