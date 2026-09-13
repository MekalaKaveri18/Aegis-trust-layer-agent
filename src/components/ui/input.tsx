import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-xl border border-[#d9d9d9] bg-white px-2.5 py-1 text-[13px] text-[#0c0c0c] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#8a8a8a] focus-visible:border-[#0c0c0c] focus-visible:ring-2 focus-visible:ring-[#c9ff4a]/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-[13px]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
