import { HelpCircle } from 'lucide-react';

export default function TooltipInfo({ content }: { content: string }) {
  if (!content) return null;
  return (
    <div className="group relative ml-1.5 inline-flex shrink-0 items-center justify-center">
      <button
        type="button"
        aria-label="Thông tin thêm"
        className="inline-flex cursor-help items-center justify-center rounded-full text-slate-500 outline-none transition-colors hover:text-amber-400 focus-visible:text-amber-400"
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
      <div className="pointer-events-none absolute left-1/2 top-0 z-50 w-max max-w-[min(18rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-[calc(100%+10px)] opacity-0 invisible transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="rounded-lg border border-slate-700/50 bg-slate-800 p-2.5 text-center text-xs leading-relaxed text-slate-200 shadow-xl shadow-black/50 break-words">
          {content}
        </div>
        <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-slate-700/50 bg-slate-800" />
      </div>
    </div>
  );
}
