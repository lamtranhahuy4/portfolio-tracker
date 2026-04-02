import { HelpCircle } from 'lucide-react';

export default function TooltipInfo({ content }: { content: string }) {
  if (!content) return null;
  return (
    <div className="relative group inline-flex items-center justify-center cursor-help ml-1.5 focus:outline-none">
      <HelpCircle className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[250px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="bg-slate-800 text-slate-200 text-xs shadow-xl shadow-black/50 border border-slate-700/50 rounded-lg p-2.5 leading-relaxed break-words text-center">
          {content}
        </div>
        <div className="w-2 h-2 bg-slate-800 border-r border-b border-slate-700/50 transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
      </div>
    </div>
  );
}
