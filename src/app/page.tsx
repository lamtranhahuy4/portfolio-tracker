import { fetchTransactions } from '@/actions/transaction';
import StoreInitializer from '@/components/StoreInitializer';
import DashboardClient from '@/components/DashboardClient';

export const dynamic = 'force-dynamic'; // Tắt cache mặc định để fetch db trực tiếp mỗi lượt truy cập mới

export default async function DashboardPage() {
  // Lấy dữ liệu qua hệ thống Server Actions (Drizzle truy vấn DB Neon)
  let initialTransactions: any[] = [];
  try {
    initialTransactions = await fetchTransactions();
  } catch (error) {
    console.error("Failed to connect to Neon Database internally or variables not set.");
  }
  
  return (
    <>
      <StoreInitializer initialTransactions={initialTransactions} />
      <DashboardClient />
    </>
  );
}
