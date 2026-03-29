import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getAccountSummary } from '@/actions/account';
import AccountClient from '@/components/AccountClient';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  const summary = await getAccountSummary();

  return <AccountClient summary={summary} />;
}
