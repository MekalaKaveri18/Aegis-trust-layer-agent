import { readFileSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { createServer as createNetServer } from "node:net";
import { join } from "node:path";
import next from "next";

const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 43147);
const dev = process.env.NODE_ENV !== "production";
const key = readFileSync(join(process.cwd(), ".certs/key.pem"));
const cert = readFileSync(join(process.cwd(), ".certs/cert.pem"));

const app = next({
  dev,
  hostname: "127.0.0.1",
  port,
  ...(dev ? { webpack: true } : {}),
});
const handle = app.getRequestHandler();

await app.prepare();

function attach(req, res, proto) {
  if (!req.headers["x-forwarded-proto"]) {
    req.headers["x-forwarded-proto"] = proto;
  }
  return handle(req, res);
}

const httpServer = createHttpServer((req, res) => attach(req, res, "http"));
const httpsServer = createHttpsServer({ key, cert }, (req, res) => attach(req, res, "https"));
httpServer.keepAliveTimeout = 5_000;
httpsServer.keepAliveTimeout = 5_000;
httpServer.headersTimeout = 15_000;
httpsServer.headersTimeout = 15_000;

// Route TLS (first byte 0x16) vs HTTP from the first data chunk.
// Do not use readable/read(1): an empty peek races Preview probes and RST's them.
// Connections with no first byte (Preview probes) must not hang forever.
const mux = createNetServer({ pauseOnConnect: true }, (socket) => {
  let handed = false;
  const handoff = (buf) => {
    if (handed || socket.destroyed) return;
    handed = true;
    clearTimeout(wait);
    socket.pause();
    socket.unshift(buf);
    if (buf[0] === 0x16) {
      httpsServer.emit("connection", socket);
    } else {
      httpServer.emit("connection", socket);
    }
    process.nextTick(() => {
      if (!socket.destroyed) socket.resume();
    });
  };

  const wait = setTimeout(() => {
    if (!handed && !socket.destroyed) socket.destroy();
  }, 2_500);
  socket.setTimeout(30_000);
  socket.once("timeout", () => {
    if (!socket.destroyed) socket.destroy();
  });
  socket.once("error", () => {
    clearTimeout(wait);
    if (!socket.destroyed) socket.destroy();
  });
  socket.once("data", (buf) => {
    if (buf?.length) handoff(buf);
  });
  socket.resume();
});

mux.listen(port, hostname, () => {
  console.log(`Aegis ready on http://127.0.0.1:${port} and https://127.0.0.1:${port}`);
});
