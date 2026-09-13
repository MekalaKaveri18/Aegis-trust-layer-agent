import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), ".certs");
const key = join(dir, "key.pem");
const cert = join(dir, "cert.pem");

if (existsSync(key) && existsSync(cert)) {
  process.exit(0);
}

mkdirSync(dir, { recursive: true });
execFileSync(
  "openssl",
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-sha256",
    "-nodes",
    "-days",
    "825",
    "-keyout",
    key,
    "-out",
    cert,
    "-subj",
    "/CN=Aegis Local",
    "-addext",
    "subjectAltName=IP:127.0.0.1,DNS:localhost",
  ],
  { stdio: "inherit" }
);
console.log("Wrote self-signed certs to .certs/ (browser will warn once; continue to 127.0.0.1).");
