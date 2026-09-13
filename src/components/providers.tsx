"use client";

import { AppShell } from "@/components/app-shell";
import { StateProvider } from "@/components/state-provider";
import { Toaster } from "@/components/ui/sonner";
import type { PublicUser } from "@/lib/auth/store";
import type { PublicState } from "@/lib/trust/types";

export function Providers({
  children,
  initial,
  user,
}: {
  children: React.ReactNode;
  initial: PublicState;
  user: PublicUser;
}) {
  return (
    <StateProvider initial={initial}>
      <AppShell user={user}>{children}</AppShell>
      <Toaster />
    </StateProvider>
  );
}
