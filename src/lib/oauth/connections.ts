import { mkdir, readFile, writeFile } from "fs/promises";
import { dataDir, dataFile } from "../data-dir";
import type { AppId } from "@/lib/trust/types";
import { getOAuthClient, oauthClientReady } from "./clients";

const FILE = dataFile("connections.json");
const STATES = dataFile("oauth-states.json");

export interface Connection {
  provider: AppId;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  accountLabel: string;
  meta?: Record<string, string | undefined>;
  connectedAt: string;
}

type ConnMap = Partial<Record<AppId, Connection>>;

async function readAll(): Promise<ConnMap> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as ConnMap;
  } catch {
    return {};
  }
}

async function writeAll(map: ConnMap) {
  await mkdir(dataDir(), { recursive: true });
  await writeFile(FILE, JSON.stringify(map, null, 2), "utf8");
}

export async function getConnection(provider: AppId): Promise<Connection | undefined> {
  const map = await readAll();
  const conn = map[provider];
  if (!conn) return undefined;
  if (provider === "gmail" && conn.refreshToken && conn.expiresAt && conn.expiresAt < Date.now() + 60_000) {
    const refreshed = await refreshGoogle(conn);
    map.gmail = refreshed;
    await writeAll(map);
    return refreshed;
  }
  return conn;
}

export async function saveConnection(conn: Connection) {
  const map = await readAll();
  map[conn.provider] = conn;
  await writeAll(map);
}

export async function deleteConnection(provider: AppId) {
  const map = await readAll();
  delete map[provider];
  await writeAll(map);
}

export async function connectionSummaries() {
  const map = await readAll();
  const providers: AppId[] = ["gmail", "slack", "notion", "github"];
  const rows = await Promise.all(
    providers.map(async (id) => {
      const configured = await oauthClientReady(id);
      const conn = map[id];
      return [
        id,
        {
          oauthConfigured: configured,
          status: conn ? ("connected" as const) : ("disconnected" as const),
          accountLabel: conn?.accountLabel,
          connectedAt: conn?.connectedAt,
        },
      ] as const;
    })
  );
  return Object.fromEntries(rows) as Record<
    AppId,
    {
      oauthConfigured: boolean;
      status: "connected" | "disconnected" | "needs_credentials";
      accountLabel?: string;
      connectedAt?: string;
    }
  >;
}

export async function putOauthState(state: string, provider: AppId, origin: string) {
  await mkdir(dataDir(), { recursive: true });
  let current: Record<string, { provider: AppId; origin: string; exp: number }> = {};
  try {
    current = JSON.parse(await readFile(STATES, "utf8"));
  } catch {
    current = {};
  }
  const now = Date.now();
  for (const [k, v] of Object.entries(current)) {
    if (v.exp < now) delete current[k];
  }
  current[state] = { provider, origin, exp: now + 15 * 60_000 };
  await writeFile(STATES, JSON.stringify(current), "utf8");
}

export async function takeOauthState(state: string): Promise<{ provider: AppId; origin: string } | null> {
  try {
    const current = JSON.parse(await readFile(STATES, "utf8")) as Record<
      string,
      { provider: AppId; origin: string; exp: number }
    >;
    const row = current[state];
    delete current[state];
    await writeFile(STATES, JSON.stringify(current), "utf8");
    if (!row || row.exp < Date.now()) return null;
    return { provider: row.provider, origin: row.origin };
  } catch {
    return null;
  }
}

async function refreshGoogle(conn: Connection): Promise<Connection> {
  const client = await getOAuthClient("gmail");
  if (!client || !conn.refreshToken) return conn;
  const body = new URLSearchParams({
    client_id: client.clientId,
    client_secret: client.clientSecret,
    refresh_token: conn.refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return conn;
  return {
    ...conn,
    accessToken: json.access_token,
    expiresAt: json.expires_in ? Date.now() + json.expires_in * 1000 : conn.expiresAt,
  };
}
