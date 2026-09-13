import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dataDir, dataFile } from "../data-dir";
import { promisify } from "util";
import { isSignedSessionToken, signSession, verifySession } from "./signed-session";

const scryptAsync = promisify(scrypt);
const DATA_DIR = dataDir();
const FILE = dataFile("auth.json");
const KEY_LEN = 64;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type Session = {
  token: string;
  userId: string;
  expiresAt: string;
};

type AuthFile = { users: AuthUser[]; sessions: Session[] };

let writeQueue: Promise<void> = Promise.resolve();

async function readAuth(): Promise<AuthFile> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as AuthFile;
    return { users: parsed.users ?? [], sessions: parsed.sessions ?? [] };
  } catch {
    return { users: [], sessions: [] };
  }
}

async function persist(data: AuthFile) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, JSON.stringify(data, null, 2), "utf8");
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = writeQueue.then(fn, fn);
  writeQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export type PublicUser = { id: string; name: string; email: string };

function toPublic(user: AuthUser): PublicUser {
  return { id: user.id, name: user.name, email: user.email };
}

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [saltHex, keyHex] = stored.split(":");
  if (!saltHex || !keyHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const key = Buffer.from(keyHex, "hex");
  const test = (await scryptAsync(password, salt, key.length)) as Buffer;
  if (test.length !== key.length) return false;
  return timingSafeEqual(key, test);
}

export async function createUser(input: { name: string; email: string; password: string }) {
  return enqueue(async () => {
    const data = await readAuth();
    const email = input.email.trim().toLowerCase();
    if (data.users.some((u) => u.email === email)) {
      throw new Error("An account with that email already exists.");
    }
    const user: AuthUser = {
      id: `user_${randomBytes(8).toString("hex")}`,
      name: input.name.trim(),
      email,
      passwordHash: await hashPassword(input.password),
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
    await persist(data);
    return toPublic(user);
  });
}

export async function authenticate(email: string, password: string) {
  const data = await readAuth();
  const user = data.users.find((u) => u.email === email.trim().toLowerCase());
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new Error("Email or password is incorrect.");
  }
  return toPublic(user);
}

export async function createSession(user: PublicUser) {
  return signSession(user);
}

export async function userFromToken(token: string | undefined | null): Promise<PublicUser | null> {
  if (!token) return null;
  const signed = verifySession(token);
  if (signed) return signed;
  if (isSignedSessionToken(token)) return null;
  const data = await readAuth();
  const session = data.sessions.find((s) => s.token === token);
  if (!session || new Date(session.expiresAt) <= new Date()) return null;
  const user = data.users.find((u) => u.id === session.userId);
  return user ? toPublic(user) : null;
}

export async function ensureUser(input: { name: string; email: string; password: string }) {
  return enqueue(async () => {
    const data = await readAuth();
    const email = input.email.trim().toLowerCase();
    const existing = data.users.find((u) => u.email === email);
    if (existing) return toPublic(existing);
    const user: AuthUser = {
      id: `user_${randomBytes(8).toString("hex")}`,
      name: input.name.trim(),
      email,
      passwordHash: await hashPassword(input.password),
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
    await persist(data);
    return toPublic(user);
  });
}

export async function destroySession(token: string | undefined | null) {
  if (!token || isSignedSessionToken(token)) return;
  return enqueue(async () => {
    const data = await readAuth();
    data.sessions = data.sessions.filter((s) => s.token !== token);
    await persist(data);
  });
}
