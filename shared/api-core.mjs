/**
 * Framework-agnostic API core.
 *
 * Both the local Express server (`server/index.mjs`) and the Vercel functions (`api/*.mjs`)
 * call these handlers, so there is exactly one implementation of the catalogue cache, the
 * upstream proxies and the key handling.
 *
 * Contract: every handler is `({query, params, headers}) => {status, body, headers?}`.
 * Keys are read from the caller's headers or the process environment, never logged, never
 * echoed back, and never written to disk.
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { fetchAaFeed } from "./aa.mjs";
import { buildCatalog, fetchOpenRouter } from "./catalog.mjs";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const ATTRIBUTION_HEADERS = {
  "HTTP-Referer": process.env.SOM_PUBLIC_URL ?? "https://llm-selector.vercel.app",
  "X-OpenRouter-Title": "LLM Selector",
};

const TTL = {
  openrouter: 10 * 60 * 1000,
  aa: 6 * 60 * 60 * 1000,
  aaFloor: 60 * 1000,
  catalog: 5 * 60 * 1000,
};

/** Module-level caches survive between warm invocations (serverless and Express alike). */
const cache = { or: new Map(), aa: new Map(), catalog: new Map(), providers: new Map() };

const hashKey = (value) => createHash("sha256").update(value).digest("hex").slice(0, 16);

function envAaKey() {
  return (process.env.ARTIFICIAL_ANALYSIS_API_KEY ?? process.env.AA_API_KEY ?? "").trim();
}

function envOrKey() {
  return (process.env.OPENROUTER_API_KEY ?? "").trim();
}

function headerValue(headers, name) {
  const direct = headers?.[name] ?? headers?.[name.toLowerCase()];
  if (typeof direct === "string") return direct.trim();
  if (Array.isArray(direct) && typeof direct[0] === "string") return direct[0].trim();
  return "";
}

function clientAaKey(headers) {
  const value = headerValue(headers, "x-aa-key");
  return value.startsWith("aa_") ? value : envAaKey();
}

async function getOpenRouterModels({ apiKey, force = false }) {
  const cacheId = apiKey ? hashKey(apiKey) : "anonymous";
  const hit = cache.or.get(cacheId);
  if (!force && hit && Date.now() - hit.at < TTL.openrouter) {
    return { models: hit.models, fetchedAt: new Date(hit.at).toISOString(), cached: true };
  }
  const models = await fetchOpenRouter({
    apiKey: apiKey || undefined,
    referer: ATTRIBUTION_HEADERS["HTTP-Referer"],
  });
  cache.or.set(cacheId, { at: Date.now(), models });
  return { models, fetchedAt: new Date().toISOString(), cached: false };
}

async function getAaFeed({ apiKey, force = false }) {
  if (!apiKey) return null;
  const cacheId = hashKey(apiKey);
  const hit = cache.aa.get(cacheId);
  const age = hit ? Date.now() - hit.at : Number.POSITIVE_INFINITY;
  if (!force && hit && age < TTL.aa) return hit.feed;
  if (hit && age < TTL.aaFloor) return hit.feed;
  const feed = await fetchAaFeed({ apiKey });
  cache.aa.set(cacheId, { at: Date.now(), feed });
  return feed;
}

export function healthHandler() {
  return {
    status: 200,
    body: {
      ok: true,
      service: "llm-selector",
      runtime: process.env.VERCEL ? "vercel" : "node",
      hasEnvAaKey: Boolean(envAaKey()),
      hasEnvOrKey: Boolean(envOrKey()),
      uptimeSeconds: Math.round(process.uptime()),
    },
    headers: { "cache-control": "no-store" },
  };
}

export async function catalogHandler({ query = {}, headers = {} } = {}) {
  const force = String(query.refresh ?? "") === "1";
  const aaKey = clientAaKey(headers);
  const orKey = headerValue(headers, "x-or-key") || envOrKey();
  const wantBenchmarks = String(query.benchmarks ?? "") !== "0";
  const cacheId = `${aaKey ? hashKey(aaKey) : "none"}|${wantBenchmarks ? "b" : "n"}|${hashKey(orKey || "anon")}`;

  const clientSuppliedKey = Boolean(headerValue(headers, "x-aa-key"));
  const cacheHeaders = clientSuppliedKey
    ? // Vary-by-header is not a thing on the CDN: a response personalised by the caller's
      // key must stay private to that caller.
      { "cache-control": "private, max-age=60" }
    : { "cache-control": "public, s-maxage=120, stale-while-revalidate=86400, stale-if-error=86400" };

  const hit = cache.catalog.get(cacheId);
  if (!force && hit && Date.now() - hit.at < TTL.catalog) {
    return { status: 200, body: hit.body, headers: { "x-som-cache": "hit", ...cacheHeaders } };
  }

  try {
    const or = await getOpenRouterModels({ apiKey: orKey, force });
    let feed = null;
    let aaError = null;
    if (wantBenchmarks && aaKey) {
      try {
        feed = await getAaFeed({ apiKey: aaKey, force });
      } catch (error) {
        aaError =
          error.status === 401 || error.status === 403
            ? "Artificial Analysis rejected the key (401/403)."
            : `Artificial Analysis unavailable: ${error.message}`;
      }
    }

    const body = buildCatalog({ orModels: or.models, aaFeed: feed, orMeta: { openRouterFetchedAt: or.fetchedAt } });
    body.meta = {
      generatedAt: new Date().toISOString(),
      cache: { openrouter: or.cached ? "hit" : "miss", artificialAnalysis: feed ? "fresh" : "none" },
      aaConfigured: Boolean(aaKey),
      aaError,
      runtime: process.env.VERCEL ? "vercel" : "node",
    };
    cache.catalog.set(cacheId, { at: Date.now(), body });
    return {
      status: 200,
      body,
      headers: { "x-som-cache": "miss", ...cacheHeaders },
    };
  } catch (error) {
    return {
      status: 502,
      body: { error: "Could not build the catalogue", detail: error.message },
      headers: { "cache-control": "no-store" },
    };
  }
}

export async function providersHandler({ params = {} } = {}) {
  const author = params.author ?? "";
  const slug = params.slug ?? "";
  if (!author || !slug) return { status: 400, body: { error: "author and slug are required" } };

  const cacheId = `${author}/${slug}`;
  const hit = cache.providers.get(cacheId);
  if (hit && Date.now() - hit.at < TTL.catalog) {
    return { status: 200, body: hit.body, headers: { "cache-control": "public, s-maxage=300" } };
  }

  const url = `https://openrouter.ai/api/v1/models/${encodeURIComponent(author)}/${encodeURIComponent(slug)}/endpoints`;
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
        quantization: endpoint.quantization ?? null,
        contextLength: endpoint.context_length ?? null,
        maxCompletionTokens: endpoint.max_completion_tokens ?? null,
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
    cache.providers.set(cacheId, { at: Date.now(), body });
    return { status: 200, body, headers: { "cache-control": "public, s-maxage=300" } };
  } catch (error) {
    return { status: 502, body: { error: "Provider lookup failed", detail: error.message } };
  }
}

export async function accountHandler({ headers = {} } = {}) {
  const key = headerValue(headers, "x-or-key") || envOrKey();
  if (!key) return { status: 400, body: { error: "No OpenRouter key supplied" } };
  try {
    const [keyRes, creditsRes] = await Promise.all([
      fetch("https://openrouter.ai/api/v1/key", {
        headers: { authorization: `Bearer ${key}`, accept: "application/json", ...ATTRIBUTION_HEADERS },
        signal: AbortSignal.timeout(15_000),
      }),
      fetch("https://openrouter.ai/api/v1/credits", {
        headers: { authorization: `Bearer ${key}`, accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      }).catch(() => null),
    ]);
    if (!keyRes.ok) {
      return {
        status: keyRes.status === 401 ? 401 : 502,
        body: { error: keyRes.status === 401 ? "OpenRouter rejected this key" : "OpenRouter is unavailable" },
        headers: { "cache-control": "no-store" },
      };
    }
    const keyJson = await keyRes.json().catch(() => null);
    let credits = null;
    if (creditsRes?.ok) {
      const creditsJson = await creditsRes.json().catch(() => null);
      credits = creditsJson?.data ?? null;
    }
    return {
      status: 200,
      body: {
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
      },
      headers: { "cache-control": "no-store" },
    };
  } catch (error) {
    return { status: 502, body: { error: "Account lookup failed", detail: error.message } };
  }
}

export async function snapshotHandler() {
  const file = join(packageRoot, "public/data/catalog.json");
  if (!existsSync(file)) return { status: 404, body: { error: "No snapshot available" }, headers: { "cache-control": "no-store" } };
  const raw = await readFile(file, "utf8");
  return {
    status: 200,
    // Static snapshot: cache hard at the edge, it changes only on deploy.
    headers: { "content-type": "application/json", "cache-control": "public, s-maxage=600, stale-while-revalidate=86400" },
    raw,
  };
}

/**
 * OpenRouter benchmark feed (requires the user's own key).
 *
 * `GET https://openrouter.ai/api/v1/benchmarks?source=…` returns Artificial Analysis indices,
 * Design Arena rows or OpenRouter's own task benchmarks, each with `meta.as_of` and the exact
 * citation OpenRouter wants displayed. 30 req/min and 500/day per account, so it is cached per
 * key for half an hour and never shared between keys.
 */
const BENCHMARK_SOURCES = new Set(["artificial-analysis", "design-arena", "openrouter"]);

export async function benchmarksHandler({ headers = {}, query = {} } = {}) {
  const key = headerValue(headers, "x-or-key") || envOrKey();
  if (!key) {
    return {
      status: 401,
      body: {
        error: "An OpenRouter key is required for the benchmark feed",
        hint: "Add your OpenRouter key in the app, or set OPENROUTER_API_KEY on the server.",
      },
      headers: { "cache-control": "no-store" },
    };
  }

  const source = BENCHMARK_SOURCES.has(String(query.source)) ? String(query.source) : "artificial-analysis";
  const cacheId = `bench:${hashKey(key)}:${source}`;
  const hit = cache.providers.get(cacheId);
  if (hit && Date.now() - hit.at < 30 * 60 * 1000) {
    return { status: 200, body: hit.body, headers: { "cache-control": "private, max-age=300" } };
  }

  const params = new URLSearchParams({ source });
  if (query.task_type) params.set("task_type", String(query.task_type));
  if (query.arena) params.set("arena", String(query.arena));
  if (query.category) params.set("category", String(query.category));

  try {
    const response = await fetch(`https://openrouter.ai/api/v1/benchmarks?${params.toString()}`, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${key}`,
        ...ATTRIBUTION_HEADERS,
      },
      signal: AbortSignal.timeout(20_000),
    });
    const text = await response.text();
    if (!response.ok) {
      return {
        status: response.status === 401 ? 401 : 502,
        body: {
          error:
            response.status === 401
              ? "OpenRouter rejected this key for the benchmark feed"
              : `OpenRouter benchmarks responded ${response.status}`,
          detail: text.slice(0, 200),
        },
        headers: { "cache-control": "no-store" },
      };
    }
    const json = JSON.parse(text);
    const body = {
      source,
      asOf: json?.meta?.as_of ?? null,
      citation: json?.meta?.citation ?? null,
      sourceUrl: json?.meta?.source_url ?? null,
      version: json?.meta?.version ?? null,
      modelCount: json?.meta?.model_count ?? (Array.isArray(json?.data) ? json.data.length : 0),
      rows: Array.isArray(json?.data) ? json.data : [],
    };
    cache.providers.set(cacheId, { at: Date.now(), body });
    return { status: 200, body, headers: { "cache-control": "private, max-age=300" } };
  } catch (error) {
    return { status: 502, body: { error: "Benchmark feed failed", detail: error.message } };
  }
}
