import { redirect } from "next/navigation";
import { ConnectForm } from "@/components/connect-form";
import type { AppId } from "@/lib/trust/types";
import { oauthClientReady } from "@/lib/oauth/clients";
import { redirectUri } from "@/lib/oauth/config";
import { getConnection } from "@/lib/oauth/connections";

const NAMES: Record<AppId, string> = {
  gmail: "Gmail",
  slack: "Slack",
  notion: "Notion",
  github: "GitHub",
};

const PROVIDERS: AppId[] = ["gmail", "slack", "notion", "github"];

export default async function ConnectPage({
  params,
  searchParams,
}: {
  params: Promise<{ provider: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { provider } = await params;
  const { error } = await searchParams;
  if (!PROVIDERS.includes(provider as AppId)) redirect("/apps");
  const app = provider as AppId;
  if (await getConnection(app)) redirect(`/apps?connected=${app}`);

  return (
    <ConnectForm
      provider={app}
      name={NAMES[app]}
      callbackUrl={redirectUri(app)}
      error={error}
      clientReady={await oauthClientReady(app)}
    />
  );
}
