import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-transparent text-[12px] font-medium tracking-[-0.01em] whitespace-nowrap transition-[background,border-color,color,transform,box-shadow] duration-150 outline-none select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-35 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "h-8 rounded-xl bg-[#c9ff4a] px-3.5 text-[12px] font-semibold text-[#0c0c0c] hover:bg-[#d6ff73]",
        outline:
          "border-[#d9d9d9] bg-transparent text-[#333] hover:border-[#0c0c0c] hover:bg-black/[0.03] hover:text-[#0c0c0c]",
        secondary:
          "border border-[#d5d5d5] bg-[#efefef] text-[#0c0c0c] hover:bg-[#e7e7e7]",
        ghost:
          "text-[#555] hover:bg-[#f7f7f5] hover:text-[#0c0c0c]",
        destructive:
          "border border-dashed border-[#cfcfcf] bg-transparent text-[#5f5f5f] hover:border-red-400/50 hover:text-red-600",
        link: "text-[#0c0c0c] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3.5",
        xs: "h-6 px-2 text-[11px]",
        sm: "h-7 px-2.5",
        lg: "h-8 px-3 text-[13px]",
        icon: "size-7",
        "icon-xs": "size-6",
        "icon-sm": "size-7",
        "icon-lg": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  type = "button",
  nativeButton = true,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      type={type}
      nativeButton={nativeButton}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
