"use client";

import { cn } from "@/lib/utils";
import type { PublicUser } from "@/lib/auth/store";
import {
  Blocks,
  Bot,
  ClipboardCheck,
  Inbox,
  LayoutDashboard,
  LogOut,
  Play,
  Scale,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAegis } from "./state-provider";
import { ResizableGroup, ResizableHandle, ResizablePanel } from "./ui/resizable";

const NAV = [
  { href: "/command", label: "Overview", icon: LayoutDashboard, section: "Workspace" },
  { href: "/agent", label: "Agent", icon: Bot, section: "Workspace" },
  { href: "/eval", label: "Eval", icon: ClipboardCheck, section: "Workspace" },
  { href: "/approvals", label: "Approvals", icon: Inbox, section: "Workspace" },
  { href: "/audit", label: "Audit", icon: ScrollText, section: "Workspace" },
  { href: "/policies", label: "Policies", icon: Scale, section: "Configure" },
  { href: "/apps", label: "Integrations", icon: Blocks, section: "Configure" },
  { href: "/playground", label: "Simulator", icon: Play, section: "Configure" },
];

function NavList({ pathname, pending }: { pathname: string; pending: number }) {
  let lastSection = "";
  return (
    <nav className="flex flex-1 flex-col gap-px overflow-y-auto px-2.5">
      {NAV.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          pathname.startsWith(`${item.href}/`) ||
          (item.href === "/apps" && pathname.startsWith("/connect"));
        const showSection = item.section !== lastSection;
        lastSection = item.section;
        return (
          <div key={item.href}>
            {showSection ? (
              <p
                className={`mb-1 px-2 font-mono text-[10px] font-medium tracking-[0.08em] text-[#8a8a8a] uppercase ${
                  item.section === "Workspace" ? "mt-1" : "mt-5"
                }`}
              >
                {item.section}
              </p>
            ) : null}
            <Link
              href={item.href}
              className={cn(
                "group relative flex items-center gap-2 px-2 py-[6px] text-[13px] tracking-tight transition-colors duration-150",
                active
                  ? "rounded-full border border-dashed border-[#bdbdbd] bg-black/[0.04] text-[#0c0c0c]"
                  : "rounded-md text-[#5f5f5f] hover:bg-black/[0.04] hover:text-[#0c0c0c]"
              )}
            >
              <Icon className={cn("size-3.5 shrink-0", active ? "opacity-90" : "opacity-55 group-hover:opacity-80")} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.href === "/approvals" && pending > 0 ? (
                <span className="rounded-md bg-[#c9ff4a] px-1.5 py-px font-mono text-[10px] tabular-nums tracking-wide text-[#0c0c0c]">
                  {pending}
                </span>
              ) : null}
            </Link>
          </div>
        );
      })}
    </nav>
  );
}

export function AppShell({ children, user }: { children: React.ReactNode; user: PublicUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useAegis();
  const pending = state.stats.pending;
  const first = user.name.split(" ")[0] || user.name;
  const live = state.apps.filter((a) => a.status === "connected").length;
  const posture = live === 4 ? "ENFORCING" : live > 0 ? "DEGRADED" : "UNBOUND";

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="h-svh bg-[#f4f4f4] text-[13px] text-[#0c0c0c]">
      <div className="hidden h-full md:block">
        <ResizableGroup id="aegis-shell" panelIds={["nav", "main"]}>
          <ResizablePanel
            id="nav"
            defaultSize={220}
            minSize={188}
            maxSize={300}
            groupResizeBehavior="preserve-pixel-size"
            className="min-h-0"
          >
            <aside className="flex h-full min-h-0 flex-col border-r border-[#d9d9d9] bg-white">
              <Link href="/" className="mb-1 flex items-center gap-2.5 px-4 py-3.5">
                <span className="flex size-5 items-center justify-center rounded-md bg-[#c9ff4a] text-[10px] font-semibold text-[#0c0c0c]">
                  A
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium tracking-tight">Aegis</p>
                  <p className="font-mono text-[9px] tracking-[0.14em] text-[#8a8a8a]">{posture}</p>
                </div>
              </Link>
              <NavList pathname={pathname} pending={pending} />
              <div className="mt-auto border-t border-[#d9d9d9] px-3.5 py-3">
                <p className="truncate text-[13px] tracking-tight">{first}</p>
                <p className="truncate text-[11px] text-[#8a8a8a]">{user.email}</p>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="mt-2 flex w-full items-center gap-2 rounded-md px-1 py-1 text-[12px] text-[#8a8a8a] transition-colors hover:text-[#0c0c0c]"
                >
                  <LogOut className="size-3.5" />
                  Sign out
                </button>
              </div>
            </aside>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel id="main" minSize="50%" className="min-h-0 min-w-0">
            <main className="h-full min-h-0 overflow-auto bg-white">{children}</main>
          </ResizablePanel>
        </ResizableGroup>
      </div>

      <div className="flex h-full flex-col md:hidden">
        <header className="shrink-0 border-b border-[#d9d9d9] bg-white">
          <div className="flex items-center justify-between px-3 py-2.5">
            <Link href="/" className="flex items-center gap-2 text-[13px] font-medium tracking-tight">
              <span className="flex size-5 items-center justify-center rounded-md bg-[#c9ff4a] text-[10px] font-semibold text-[#0c0c0c]">
                A
              </span>
              Aegis
            </Link>
            <button type="button" onClick={() => void signOut()} className="text-[12px] text-[#8a8a8a]">
              Sign out
            </button>
          </div>
          <div className="flex gap-0.5 overflow-x-auto px-2 pb-2">
            {NAV.map((item) => {
              const active = pathname === item.href || (item.href === "/apps" && pathname.startsWith("/connect"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 rounded-full px-2 py-1 text-[12px] tracking-tight",
                    active ? "border border-dashed border-[#bdbdbd] bg-black/[0.04]" : "text-[#737373]"
                  )}
                >
                  {item.label}
                  {item.href === "/approvals" && pending > 0 ? (
                    <span className="ml-1 font-mono text-[10px]">{pending}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
