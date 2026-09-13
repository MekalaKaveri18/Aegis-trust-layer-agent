"use client";

import Link from "next/link";
import { useState } from "react";

const LINKS = [
  { href: "/#product", label: "Product" },
  { href: "/#use-cases", label: "Use cases" },
  { href: "/#integrations", label: "MCP & SDK" },
  { href: "/#security", label: "Security" },
  { href: "/#faq", label: "FAQ" },
];

export function LandingHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#d9d9d9] bg-white">
      <nav className="relative mx-auto flex h-[69px] max-w-[1340px] items-center justify-center px-5 md:px-8">
        <Link href="/" className="absolute left-5 flex items-center gap-2 md:left-8">
          <span className="flex size-7 items-center justify-center rounded-md bg-[#c9ff4a] text-[12px] font-semibold text-[#0c0c0c]">
            A
          </span>
          <span className="text-[18px] font-medium tracking-[-0.05em]">Aegis</span>
        </Link>
        <div className="hidden items-center gap-5 text-[12px] lg:flex">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:underline hover:underline-offset-4">
              [{link.label}]
            </a>
          ))}
        </div>
        <div className="absolute right-5 flex items-center gap-2 md:right-8">
          <Link href="/signin" className="hidden text-[12px] font-medium sm:inline hover:underline hover:underline-offset-4">
            [Sign in]
          </Link>
          <Link href="/signup" className="agnost-btn-dark">
            Get started
          </Link>
          <button
            type="button"
            className="font-mono text-[12px] uppercase lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? "Close −" : "Open +"}
          </button>
        </div>
      </nav>
      {open ? (
        <div className="border-t border-[#d9d9d9] bg-white px-5 py-4 lg:hidden">
          <div className="flex flex-col gap-3 text-[14px]">
            {LINKS.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </a>
            ))}
            <Link href="/signin" onClick={() => setOpen(false)}>
              Sign in
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
