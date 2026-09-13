import { getPublicState } from "@/lib/trust/store";
import { Providers } from "@/components/providers";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  const initial = await getPublicState();
  return (
    <Providers initial={initial} user={user}>
      {children}
    </Providers>
  );
}
