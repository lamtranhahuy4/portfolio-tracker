import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "danger" | "warning" | "neutral"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        {
          "border-transparent bg-blue-600/20 text-blue-400": variant === "default",
          "border-emerald-500/30 bg-emerald-500/10 text-emerald-400": variant === "success",
          "border-rose-500/30 bg-rose-500/10 text-rose-400": variant === "danger",
          "border-amber-500/30 bg-amber-500/10 text-amber-400": variant === "warning",
          "border-slate-700 bg-slate-800 text-slate-300": variant === "neutral",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
