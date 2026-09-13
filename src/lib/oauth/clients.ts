import { mkdir, readFile, writeFile } from "fs/promises";
import { dataDir, dataFile } from "../data-dir";
import type { AppId } from "@/lib/trust/types";
import { normalizeCredential, oauthClientIssue } from "./validate";

const FILE = dataFile("oauth-clients.json");

export type OAuthClient = { clientId: string; clientSecret: string };
type ClientMap = Partial<Record<AppId, OAuthClient>>;

const ENV_KEYS: Record<AppId, [string, string]> = {
  gmail: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  slack: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
  notion: ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"],
  github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
};

async function readSaved(): Promise<ClientMap> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as ClientMap;
  } catch {
    return {};
  }
}

function usable(provider: AppId, client: OAuthClient | null): OAuthClient | null {
  if (!client?.clientId || !client.clientSecret) return null;
  const clientId = normalizeCredential(client.clientId);
  const clientSecret = client.clientSecret.trim().replace(/^["']+|["']+$/g, "");
  if (oauthClientIssue(provider, clientId, clientSecret)) return null;
  return { clientId, clientSecret };
}

export async function getOAuthClient(provider: AppId): Promise<OAuthClient | null> {
  const [idKey, secretKey] = ENV_KEYS[provider];
  const fromEnv = usable(provider, {
    clientId: process.env[idKey] || "",
    clientSecret: process.env[secretKey] || "",
  });
  if (fromEnv) return fromEnv;
  const saved = await readSaved();
  const row = usable(provider, saved[provider] ?? null);
  if (row) return row;
  if (saved[provider]) await deleteOAuthClient(provider);
  return null;
}

export async function saveOAuthClient(provider: AppId, client: OAuthClient) {
  const current = await readSaved();
  const clientId = normalizeCredential(client.clientId);
  const clientSecret = client.clientSecret.trim().replace(/^["']+|["']+$/g, "");
  current[provider] = { clientId, clientSecret };
  await mkdir(dataDir(), { recursive: true });
  await writeFile(FILE, JSON.stringify(current, null, 2), "utf8");
}

export async function deleteOAuthClient(provider: AppId) {
  const current = await readSaved();
  delete current[provider];
  await mkdir(dataDir(), { recursive: true });
  await writeFile(FILE, JSON.stringify(current, null, 2), "utf8");
}

export async function oauthClientReady(provider: AppId) {
  return Boolean(await getOAuthClient(provider));
}
