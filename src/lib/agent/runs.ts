import { mkdir, readFile, writeFile } from "fs/promises";
import { dataDir, dataFile } from "../data-dir";
import type { AgentRun } from "./types";

const FILE = dataFile("agent-runs.json");

type FileShape = { runs: AgentRun[] };

async function readAll(): Promise<AgentRun[]> {
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as FileShape;
    return parsed.runs ?? [];
  } catch {
    return [];
  }
}

async function writeAll(runs: AgentRun[]) {
  await mkdir(dataDir(), { recursive: true });
  await writeFile(FILE, JSON.stringify({ runs: runs.slice(0, 20) }, null, 2));
}

export async function saveRun(run: AgentRun) {
  const runs = await readAll();
  const { state: _omit, ...rest } = run;
  const next = [rest as AgentRun, ...runs.filter((r) => r.id !== run.id)].slice(0, 20);
  await writeAll(next);
}

export async function getRun(id: string) {
  const runs = await readAll();
  return runs.find((r) => r.id === id) ?? null;
}

export async function latestRun() {
  const runs = await readAll();
  return runs[0] ?? null;
}
