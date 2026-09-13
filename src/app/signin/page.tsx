import { LandingHeader } from "@/components/landing-header";
import { SigninForm } from "@/components/auth-forms";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function SigninPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; registered?: string }>;
}) {
  if (await getCurrentUser()) redirect("/agent");
  const params = await searchParams;
  const nextPath = params.next && params.next.startsWith("/") ? params.next : "/agent";

  return (
    <div className="min-h-full bg-[#f4f4f4] text-[#0c0c0c]">
      <div className="paper-page mx-auto min-h-full" style={{ width: "min(100%, 1340px)" }}>
        <LandingHeader />
        <main className="mx-auto flex max-w-md flex-col px-5 pt-16 pb-16">
          <p className="font-mono text-[10px] font-medium tracking-[0.08em] uppercase">Welcome back</p>
          <h1 className="font-heading mt-3 text-[44px] leading-tight">Sign in to Aegis</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-[#5f5f5f]">
            Use your work email and password to open the trust layer.
          </p>
          <div className="dash-card mt-8 p-6">
            <SigninForm nextPath={nextPath} registered={params.registered === "1"} />
          </div>
        </main>
      </div>
    </div>
  );
}
