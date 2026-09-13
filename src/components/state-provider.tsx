"use client";

import { fetchState } from "@/lib/client";
import type { PublicState } from "@/lib/trust/types";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const Ctx = createContext<{
  state: PublicState;
  error: string | null;
  refresh: () => Promise<void>;
  setState: (s: PublicState) => void;
} | null>(null);

export function StateProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial: PublicState;
}) {
  const [state, setState] = useState<PublicState>(initial);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const next = await fetchState();
      setState(next);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load Aegis");
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      void refresh();
    }, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  return <Ctx.Provider value={{ state, error, refresh, setState }}>{children}</Ctx.Provider>;
}

export function useAegis() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAegis must be used within StateProvider");
  return ctx;
}
