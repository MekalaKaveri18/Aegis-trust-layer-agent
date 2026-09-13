import { LandingHeader } from "@/components/landing-header";
import { SignupForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/agent");

  return (
    <div className="min-h-full bg-[#f4f4f4] text-[#0c0c0c]">
      <div className="paper-page mx-auto min-h-full" style={{ width: "min(100%, 1340px)" }}>
        <LandingHeader />
        <main className="mx-auto flex max-w-md flex-col px-5 pt-16 pb-16">
          <p className="font-mono text-[10px] font-medium tracking-[0.08em] uppercase">Get started</p>
          <h1 className="font-heading mt-3 text-[44px] leading-tight">Create your Aegis account</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-[#5f5f5f]">
            Create an account to open the trust layer, MCP endpoint, and SDKs.
          </p>
          <div className="dash-card mt-8 p-6">
            <SignupForm />
          </div>
        </main>
      </div>
    </div>
  );
}
