"use client";

import { cn } from "@/lib/utils";
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels";

export function ResizableGroup({
  id,
  panelIds,
  className,
  children,
  orientation = "horizontal",
}: {
  id: string;
  panelIds: string[];
  className?: string;
  children: React.ReactNode;
  orientation?: "horizontal" | "vertical";
}) {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id,
    panelIds,
    storage: {
      getItem: (key) => (typeof window === "undefined" ? null : window.localStorage.getItem(key)),
      setItem: (key, value) => {
        if (typeof window !== "undefined") window.localStorage.setItem(key, value);
      },
    },
  });

  return (
    <Group
      id={id}
      className={cn("h-full w-full", className)}
      orientation={orientation}
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
    >
      {children}
    </Group>
  );
}

export { Panel as ResizablePanel };

export function ResizableHandle({ className }: { className?: string }) {
  return (
    <Separator
      className={cn(
        "group relative flex w-1.5 items-center justify-center bg-transparent outline-none",
        "data-[separator]:cursor-col-resize",
        className
      )}
    >
      <span className="h-full w-px bg-[#d9d9d9] transition-colors group-hover:bg-[#c9ff4a] group-active:bg-[#c9ff4a] group-data-[resize-handle-active]:bg-[#c9ff4a]" />
    </Separator>
  );
}
