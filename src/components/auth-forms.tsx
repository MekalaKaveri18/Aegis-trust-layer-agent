"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";

function safeNextPath(path: string, fallback: string) {
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

function goAfterAuth(path: string) {
  window.location.assign(path);
}

export function SignupForm() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not create your account.");
        return;
      }
      goAfterAuth("/agent");
    } catch {
      setError("Could not create your account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required autoComplete="name" placeholder="Casey Rivera" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="casey@company.com" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <p className="text-xs text-[#8a8a8a]">At least 8 characters.</p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" className="h-8 w-full" disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-center text-sm text-[#5f5f5f]">
        Already have an account?{" "}
        <Link href="/signin" className="text-[#0c0c0c] underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function SigninForm({ nextPath, registered }: { nextPath: string; registered?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not sign in.");
        return;
      }
      goAfterAuth(safeNextPath(nextPath, "/agent"));
    } catch {
      setError("Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {registered ? (
        <p className="rounded-xl border border-dashed border-[#cfcfcf] bg-[#f7f7f5] px-3 py-2 text-[13px] text-[#0c0c0c]">
          Account created. Sign in to open Aegis.
        </p>
      ) : null}
      <div className="grid gap-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" className="h-8 w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-sm text-[#5f5f5f]">
        New here?{" "}
        <Link href="/signup" className="text-[#0c0c0c] underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </form>
  );
}
