import path from "path";

/** Local demo store. On Vercel the app filesystem is read-only except /tmp. */
export function dataDir() {
  if (process.env.AEGIS_DATA_DIR) return process.env.AEGIS_DATA_DIR;
  if (process.env.VERCEL) return "/tmp/aegis-data";
  return path.join(/* turbopackIgnore: true */ process.cwd(), ".data");
}

export function dataFile(name: string) {
  return path.join(/* turbopackIgnore: true */ dataDir(), name);
}
