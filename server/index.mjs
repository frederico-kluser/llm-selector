/**
 * SOM API server.
 *
 * Responsibilities
 *  - Serve the built SPA.
 *  - Build the catalogue from OpenRouter (+ the caller's Artificial Analysis feed).
 *  - Proxy the few upstream calls that a browser cannot make (AA has no CORS grant).
 *
 * Hard rules
 *  - Keys are read from env or from the caller's request headers and are NEVER logged,
 *    persisted, or included in a response body.
 *  - Artificial Analysis payloads live in a short-lived in-memory cache only. Nothing
 *    derived from them is written to disk — see NOTICE.md for the licensing rationale.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

import { fetchAaFeed } from "../shared/aa.mjs";
import { buildCatalog, fetchOpenRouter } from "../shared/catalog.mjs";

const ATTRIBUTION_HEADERS = {
  "HTTP-Referer": process.env.SOM_PUBLIC_URL ?? "http://localhost:5173",
  "X-OpenRouter-Title": "SOM - LLM Selector",
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const publicDir = join(root, "public");

const PORT = Number(process.env.PORT ?? 8899);
const HOST = process.env.HOST ?? "127.0.0.1";

const ENV_AA_KEY = (process.env.ARTIFICIAL_ANALYSIS_API_KEY ?? process.env.AA_API_KEY ?? "").trim();
const ENV_OR_KEY = (process.env.OPENROUTER_API_KEY ?? "").trim();

const OR_TTL_MS = 10 * 60 * 1000;
const AA_TTL_MS = 6 * 60 * 60 * 1000;
const AA_MIN_INTERVAL_MS = 60 * 1000;
const CATALOG_TTL_MS = 5 * 60 * 1000;

/** @type {{or?: {at:number, models:any[]}, catalog: Map<string,{at:number,body:any}>}} */
const cache = { catalog: new Map(), aa: new Map(), or: new Map() };

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));

function hashKey(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function clientAaKey(req) {
  const header = req.get("x-aa-key");
  if (typeof header === "string" && header.trim().startsWith("aa_")) return header.trim();
  return ENV_AA_KEY;
}

async function getOpenRouterModels({ apiKey, force = false }) {
  const keyId = apiKey ? hashKey(apiKey) : "anonymous";
  const hit = cache.or.get(keyId);
  if (!force && hit && Date.now() - hit.at < OR_TTL_MS) {
    return { models: hit.models, fetchedAt: new Date(hit.at).toISOString(), cached: true };
  }
  const models = await fetchOpenRouter({ apiKey: apiKey || undefined });
  cache.or.set(keyId, { at: Date.now(), models });
  return { models, fetchedAt: new Date().toISOString(), cached: false };
}

async function getAaFeed({ apiKey, force = false }) {
  if (!apiKey) return null;
  const keyId = hashKey(apiKey);
  const hit = cache.aa.get(keyId);
  const age = hit ? Date.now() - hit.at : Number.POSITIVE_INFINITY;
  if (!force && hit && age < AA_TTL_MS) return hit.feed;
  // Protect the 100 req/24h free quota: never refetch faster than the floor interval.
  if (hit && age < AA_MIN_INTERVAL_MS) return hit.feed;
  const feed = await fetchAaFeed({ apiKey });
  cache.aa.set(keyId, { at: Date.now(), feed });
  return feed;
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "llm-selector",
    hasEnvAaKey: Boolean(ENV_AA_KEY),
    hasEnvOrKey: Boolean(ENV_OR_KEY),
    uptimeSeconds: Math.round(process.uptime()),
  });
});

app.get("/api/catalog", async (req, res) => {
  const force = req.query.refresh === "1";
  const aaKey = clientAaKey(req);
  const orKey = (req.get("x-or-key") ?? "").trim() || ENV_OR_KEY;
  const wantBenchmarks = req.query.benchmarks !== "0";
  const cacheId = `${aaKey ? hashKey(aaKey) : "none"}|${wantBenchmarks ? "b" : "n"}|${hashKey(orKey || "anon")}`;

  const cached = cache.catalog.get(cacheId);
  if (!force && cached && Date.now() - cached.at < CATALOG_TTL_MS) {
    res.set("x-som-cache", "hit");
    res.set("cache-control", "private, max-age=120");
    return res.json(cached.body);
  }

  try {
    const or = await getOpenRouterModels({ apiKey: orKey, force });
    void ATTRIBUTION_HEADERS;
    let feed = null;
    let aaError = null;
    if (wantBenchmarks && aaKey) {
      try {
        feed = await getAaFeed({ apiKey: aaKey, force });
      } catch (error) {
        aaError = error.status === 401 || error.status === 403
          ? "Artificial Analysis rejected the key (401/403)."
          : `Artificial Analysis unavailable: ${error.message}`;
        console.warn(`[aa] ${aaError}`);
      }
    }

    const body = buildCatalog({
      orModels: or.models,
      aaFeed: feed,
      orMeta: { openRouterFetchedAt: or.fetchedAt },
    });
    body.meta = {
      generatedAt: new Date().toISOString(),
      cache: { openrouter: or.cached ? "hit" : "miss", artificialAnalysis: feed ? "fresh" : "none" },
      aaConfigured: Boolean(aaKey),
      aaError,
      aaBilling: "free",
    };
    cache.catalog.set(cacheId, { at: Date.now(), body });
    res.set("x-som-cache", "miss");
    res.json(body);
  } catch (error) {
    console.error(`[catalog] ${error.message}`);
    res.status(502).json({ error: "Could not build the catalogue", detail: error.message });
  }
});

app.get("/api/providers/:author/:slug", async (req, res) => {
  const { author, slug } = req.params;
  const url = `https://openrouter.ai/api/v1/models/${encodeURIComponent(author)}/${encodeURIComponent(slug)}/endpoints`;
  const cacheId = `providers:${author}/${slug}`;
  const hit = cache.catalog.get(cacheId);
  if (hit && Date.now() - hit.at < CATALOG_TTL_MS) return res.json(hit.body);
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json", ...ATTRIBUTION_HEADERS },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const body = {
      id: json?.data?.id ?? `${author}/${slug}`,
      endpoints: (json?.data?.endpoints ?? []).map((endpoint) => ({
        name: endpoint.name,
        providerName: endpoint.provider_name,
        tag: endpoint.tag,
        quantization: endpoint.quantization,
        contextLength: endpoint.context_length,
        maxCompletionTokens: endpoint.max_completion_tokens,
        pricing: endpoint.pricing ?? null,
        throughput: endpoint.throughput_last_30m ?? null,
        latency: endpoint.latency_last_30m ?? null,
        uptime: {
          last5m: endpoint.uptime_last_5m ?? null,
          last30m: endpoint.uptime_last_30m ?? null,
          last1d: endpoint.uptime_last_1d ?? null,
        },
        supportsImplicitCaching: endpoint.supports_implicit_caching ?? null,
        status: endpoint.status ?? null,
      })),
    };
    cache.catalog.set(cacheId, { at: Date.now(), body });
    res.json(body);
  } catch (error) {
    res.status(502).json({ error: "Provider lookup failed", detail: error.message });
  }
});

app.get("/api/account", async (req, res) => {
  const key = (req.get("x-or-key") ?? "").trim() || ENV_OR_KEY;
  if (!key) return res.status(400).json({ error: "No OpenRouter key supplied" });
  try {
    const [keyRes, creditsRes] = await Promise.all([
      fetch("https://openrouter.ai/api/v1/key", {
        headers: { authorization: `Bearer ${key}`, accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      }),
      fetch("https://openrouter.ai/api/v1/credits", {
        headers: { authorization: `Bearer ${key}`, accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      }).catch(() => null),
    ]);
    if (!keyRes.ok) {
      return res.status(keyRes.status === 401 ? 401 : 502).json({
        error: keyRes.status === 401 ? "OpenRouter rejected this key" : "OpenRouter is unavailable",
      });
    }
    const keyJson = await keyRes.json().catch(() => null);
    let credits = null;
    if (creditsRes?.ok) {
      const creditsJson = await creditsRes.json().catch(() => null);
      credits = creditsJson?.data ?? null;
    }
    res.json({
      key: {
        label: keyJson?.data?.label ?? null,
        limit: keyJson?.data?.limit ?? null,
        limitRemaining: keyJson?.data?.limit_remaining ?? null,
        usage: keyJson?.data?.usage ?? null,
        usageMonthly: keyJson?.data?.usage_monthly ?? null,
        isFreeTier: keyJson?.data?.is_free_tier ?? null,
        rateLimit: keyJson?.data?.rate_limit ?? null,
      },
      credits,
    });
  } catch (error) {
    res.status(502).json({ error: "Account lookup failed", detail: error.message });
  }
});

app.get("/api/snapshot", async (_req, res) => {
  const file = join(publicDir, "data/catalog.json");
  if (!existsSync(file)) return res.status(404).json({ error: "No snapshot available" });
  res.type("application/json").send(await readFile(file, "utf8"));
});

if (existsSync(dist)) {
  app.use(express.static(dist, { maxAge: "1h", index: false }));
  app.use(express.static(publicDir, { maxAge: "1h", index: false }));
  // SPA fallback (Express 5 no longer accepts a bare "*" path)
  app.use((_req, res) => res.sendFile(join(dist, "index.html")));
} else {
  app.get("/", (_req, res) =>
    res.type("text/plain").send("llm-selector API is running. Build the app with `pnpm build`."),
  );
}

app.listen(PORT, HOST, () => {
  console.log(`llm-selector api   http://${HOST}:${PORT}`);
  console.log(`          artificial analysis key: ${ENV_AA_KEY ? "env ✓" : "not set (bring your own)"}`);
  console.log(`          openrouter key: ${ENV_OR_KEY ? "env ✓" : "not set (anonymous catalogue)"}`);
});
