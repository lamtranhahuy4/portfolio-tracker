export default function ForexLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-emerald-500"></div>
        <p className="text-sm font-medium text-slate-400">Đang tải dữ liệu tỷ giá...</p>
      </div>
    </div>
  );
}
