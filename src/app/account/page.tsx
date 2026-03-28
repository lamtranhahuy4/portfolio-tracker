import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { getAccountSummary } from '@/actions/account';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import DeletePortfolioDataForm from '@/components/DeletePortfolioDataForm';
import { ArrowLeft, UserCircle2, Activity, HardDrive, Filter, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  const summary = await getAccountSummary();

  const formatDate = (date: Date | null) => {
    if (!date) return 'Chưa có dữ liệu';
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
      <main className="max-w-[700px] w-full mx-auto py-8 px-4 sm:px-0 space-y-8">
        
        {/* Lệnh Điều Hướng */}
        <div className="flex items-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-white dark:bg-gray-900 px-4 py-2 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-md">
            <ArrowLeft className="w-4 h-4" />
            Trở lại Bảng điều khiển
          </Link>
        </div>

        {/* Thông Tin Tài Khoản / Header */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-16 -top-16 w-48 h-48 bg-indigo-50 dark:bg-indigo-900/10 rounded-full group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start relative z-10">
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-inner shrink-0 text-white">
               <UserCircle2 className="w-12 h-12" />
            </div>
            <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
              <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">Tài Khoản Của Bạn</h1>
              <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">{summary.user.email}</p>
              
              <div className="mt-4 flex flex-wrap max-w-sm w-full gap-2 items-center flex-col sm:flex-row text-xs uppercase tracking-wide text-gray-400 font-semibold bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                <span className="flex gap-1 items-center px-2 border-r border-gray-200 dark:border-gray-700 last:border-0">
                  <span className="text-gray-500 dark:text-gray-400">ID:</span> 
                  <span className="font-mono text-[10px] lowercase truncate w-24" title={summary.user.id}>{summary.user.id}</span>
                </span>
                <span className="flex gap-1 items-center px-2">
                  <span className="text-gray-500 dark:text-gray-400">Tham gia:</span> 
                  {new Date(summary.user.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tóm tắt Dữ liệu Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
              <Activity className="w-4 h-4 text-emerald-500" />
              Tổng Lệnh GD
            </div>
            <span className="text-3xl font-black">{summary.transactionCount}</span>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm flex flex-col gap-3">
             <div className="flex items-center gap-2 text-sm font-semibold text-gray-500">
              <Filter className="w-4 h-4 text-orange-500" />
              Khác Biệt Loại Tài Sản
            </div>
            <span className="text-3xl font-black">{summary.distinctTickerCount}</span>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm flex flex-col gap-3 col-span-2 sm:col-span-1">
             <div className="flex flex-col gap-1">
               <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-2">
                 <HardDrive className="w-4 h-4 text-blue-500" />
                 Nguồn Import
               </div>
               {summary.sourceBreakdown.length > 0 ? (
                 <div className="space-y-2">
                   {summary.sourceBreakdown.map(s => (
                     <div key={s.source} className="flex justify-between items-center text-sm font-medium bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
                       <span className="text-gray-600 dark:text-gray-300 capitalize">{s.source}</span>
                       <span className="text-gray-900 dark:text-white font-bold bg-white dark:bg-gray-900 px-2 py-0.5 rounded shadow-sm border border-gray-200 dark:border-gray-800">{s.count}</span>
                     </div>
                   ))}
                 </div>
               ) : (
                 <span className="text-sm font-medium text-gray-400 px-3 py-1.5">Chưa có dữ liệu</span>
               )}
             </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-5 rounded-2xl shadow-sm flex flex-col gap-3 col-span-2 sm:col-span-1 justify-center">
             <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 shrink-0">
               <Clock className="w-4 h-4 text-purple-500" />
               Giao dịch Mới Nhất
             </div>
             <span className="text-sm font-mono font-medium tracking-tight bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 text-center text-gray-700 dark:text-gray-300">
               {formatDate(summary.lastTransactionAt)}
             </span>
          </div>
        </div>

        {/* Change Password */}
        <ChangePasswordForm />

        {/* Delete Data Zone */}
        <DeletePortfolioDataForm />

      </main>
    </div>
  );
}
