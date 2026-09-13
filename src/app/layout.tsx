import type { Metadata } from "next";
import { DM_Mono, Geist, Instrument_Serif } from "next/font/google";
import "./globals.css";

const body = Geist({
  variable: "--font-body",
  subsets: ["latin"],
});

const heading = Instrument_Serif({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const mono = DM_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Aegis — Trust layer for AI agents",
  description:
    "Aegis sits between AI agents and their tools to keep sensitive data off the model. Policy-based data minimization, MCP integration, and SDKs for AI applications.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${heading.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#f4f4f4] font-sans">{children}</body>
    </html>
  );
}
