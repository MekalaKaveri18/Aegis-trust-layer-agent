import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  lead,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  lead?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#d9d9d9] px-6 py-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex max-w-xl items-start gap-3">
        {lead}
        <div className="min-w-0">
          <h1 className="text-[17px] font-medium tracking-tight">{title}</h1>
          {description ? <p className="mt-1 text-[13px] leading-relaxed text-[#5f5f5f]">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function ProductBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-6 py-5 ${className}`}>{children}</div>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`dash-card overflow-hidden ${className}`}>{children}</div>;
}

export function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-dashed border-[#cfcfcf] px-3.5 py-2 text-[11px] font-medium tracking-tight text-[#737373]">
      {children}
    </div>
  );
}
