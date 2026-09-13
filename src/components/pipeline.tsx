import { cn } from "@/lib/utils";
import type { PipelineStep } from "@/lib/trust/types";
import { Check, CircleSlash, Pause, Minus } from "lucide-react";

export function Pipeline({ steps }: { steps: PipelineStep[] }) {
  if (!steps.length) {
    return <p className="text-[13px] text-[#8a8a8a]">No pipeline captured for this seed event.</p>;
  }
  return (
    <ol className="space-y-0">
      {steps.map((step, i) => (
        <li key={step.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={cn(
                "flex size-5 items-center justify-center rounded-full border",
                step.status === "pass" && "border-[#d9d9d9] bg-[#c9ff4a] text-[#0c0c0c]",
                step.status === "hold" && "border-amber-300 bg-amber-50 text-amber-800",
                step.status === "fail" && "border-red-200 bg-red-50 text-red-700",
                step.status === "skip" && "border-[#d9d9d9] bg-transparent text-[#8a8a8a]"
              )}
            >
              {step.status === "fail" ? (
                <CircleSlash className="size-2.5" />
              ) : step.status === "hold" ? (
                <Pause className="size-2.5" />
              ) : step.status === "skip" ? (
                <Minus className="size-2.5" />
              ) : (
                <Check className="size-2.5 stroke-[2.5]" />
              )}
            </span>
            {i < steps.length - 1 ? <span className="my-1 w-px flex-1 min-h-3 bg-[#d9d9d9]" /> : null}
          </div>
          <div className={i < steps.length - 1 ? "pb-4" : ""}>
            <p className="text-[13px] font-medium tracking-tight text-[#0c0c0c]">{step.label}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#737373]">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
