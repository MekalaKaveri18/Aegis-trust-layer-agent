import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-xl border border-[#d9d9d9] bg-white px-2.5 py-2 text-[13px] transition-colors outline-none placeholder:text-[#8a8a8a] focus-visible:border-[#0c0c0c] focus-visible:ring-2 focus-visible:ring-[#c9ff4a]/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive md:text-[13px]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
