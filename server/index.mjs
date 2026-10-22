/**
 * Local Express server: a thin adapter over `shared/api-core.mjs`.
 * The Vercel functions in `api/` call the exact same handlers.
 */

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

import {
  accountHandler,
  benchmarksHandler,
  catalogHandler,
  healthHandler,
  providersHandler,
  snapshotHandler,
} from "../shared/api-core.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const publicDir = join(root, "public");

const PORT = Number(process.env.PORT ?? 8899);
const HOST = process.env.HOST ?? "127.0.0.1";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));

/** Copy a handler result onto an Express response. */
async function send(res, promise) {
  try {
    const result = await promise;
    for (const [name, value] of Object.entries(result.headers ?? {})) res.set(name, value);
    if (typeof result.raw === "string") return res.status(result.status).send(result.raw);
    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error(`[api] ${error.message}`);
    return res.status(500).json({ error: "Unhandled API error" });
  }
}

app.get("/api/health", (_req, res) => send(res, Promise.resolve(healthHandler())));
app.get("/api/catalog", (req, res) =>
  send(res, catalogHandler({ query: req.query, headers: req.headers })),
);
app.get("/api/providers/:author/:slug", (req, res) =>
  send(res, providersHandler({ params: req.params })),
);
app.get("/api/account", (req, res) => send(res, accountHandler({ headers: req.headers })));
app.get("/api/benchmarks", (req, res) =>
  send(res, benchmarksHandler({ headers: req.headers, query: req.query })),
);
app.get("/api/snapshot", (_req, res) => send(res, snapshotHandler()));

if (existsSync(dist)) {
  app.use(express.static(dist, { maxAge: "1h", index: false }));
  app.use(express.static(publicDir, { maxAge: "1h", index: false }));
  app.use((_req, res) => res.sendFile(join(dist, "index.html")));
} else {
  app.get("/", (_req, res) =>
    res.type("text/plain").send("llm-selector API is running. Build the app with `pnpm build`."),
  );
}

app.listen(PORT, HOST, () => {
  console.log(`llm-selector api   http://${HOST}:${PORT}`);
  console.log(`                   artificial analysis key: ${process.env.ARTIFICIAL_ANALYSIS_API_KEY ? "env ✓" : "not set (bring your own)"}`);
  console.log(`                   openrouter key: ${process.env.OPENROUTER_API_KEY ? "env ✓" : "not set (anonymous catalogue)"}`);
});
