import type { AaFeed, Catalog } from "./types";

export const SNAPSHOT_URL = "/data/catalog.json";
export const API_BASE = "/api";

export interface Keys {
  openrouter: string;
  artificialAnalysis: string;
}

const KEY_STORAGE = "llm-selector.keys.v1";
const EMPTY_KEYS: Keys = { openrouter: "", artificialAnalysis: "" };

function parseKeys(raw: string | null): Keys | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Keys>;
    return {
      openrouter: typeof parsed.openrouter === "string" ? parsed.openrouter : "",
      artificialAnalysis:
        typeof parsed.artificialAnalysis === "string" ? parsed.artificialAnalysis : "",
    };
  } catch {
    return null;
  }
}

/**
 * Persistence is session-scoped by default: a BYO-key client cannot protect a key from XSS, so
 * the safer default is "forget me when the tab closes". localStorage is written only when the
 * user explicitly opts in.
 */
export function loadKeys(): Keys {
  if (typeof window === "undefined") return { ...EMPTY_KEYS };
  return (
    parseKeys(sessionStorage.getItem(KEY_STORAGE)) ??
    parseKeys(localStorage.getItem(KEY_STORAGE)) ??
    { ...EMPTY_KEYS }
  );
}

export function saveKeys(keys: Keys, remember = false) {
  if (typeof window === "undefined") return;
  const hasKeys = Boolean(keys.openrouter || keys.artificialAnalysis);
  if (!hasKeys) {
    sessionStorage.removeItem(KEY_STORAGE);
    localStorage.removeItem(KEY_STORAGE);
    return;
  }
  sessionStorage.setItem(KEY_STORAGE, JSON.stringify(keys));
  if (remember) localStorage.setItem(KEY_STORAGE, JSON.stringify(keys));
  else localStorage.removeItem(KEY_STORAGE);
}

export function maskKey(key: string): string {
  if (!key) return "not set";
  if (key.length <= 10) return `${key.slice(0, 2)}…`;
  return `${key.slice(0, 7)}…${key.slice(-4)}`;
}

export interface CatalogResponse extends Catalog {
  meta?: {
    generatedAt: string;
    cache: { openrouter: string; artificialAnalysis: string };
    aaConfigured: boolean;
    aaError: string | null;
    aaBilling?: string;
  };
}

export interface LoadCatalogOptions {
  keys: Keys;
  refresh?: boolean;
  includeBenchmarks?: boolean;
  signal?: AbortSignal;
}

export interface LoadCatalogResult {
  catalog: CatalogResponse;
  source: "api" | "snapshot";
}

async function requestCatalog({
  keys,
  refresh,
  includeBenchmarks = true,
  signal,
}: LoadCatalogOptions): Promise<CatalogResponse> {
  const params = new URLSearchParams();
  if (refresh) params.set("refresh", "1");
  if (!includeBenchmarks) params.set("benchmarks", "0");
  const headers: Record<string, string> = { accept: "application/json" };
  if (keys.artificialAnalysis) headers["x-aa-key"] = keys.artificialAnalysis;
  if (keys.openrouter) headers["x-or-key"] = keys.openrouter;
  const response = await fetch(`${API_BASE}/catalog?${params.toString()}`, { headers, signal });
  if (!response.ok) throw new Error(`catalogue API responded ${response.status}`);
  return (await response.json()) as CatalogResponse;
}

async function requestSnapshot(signal?: AbortSignal): Promise<CatalogResponse> {
  const response = await fetch(SNAPSHOT_URL, { signal });
  if (!response.ok) throw new Error(`snapshot responded ${response.status}`);
  return (await response.json()) as CatalogResponse;
}

/**
 * Live API first (it can merge the user's Artificial Analysis key), committed snapshot as
 * the fallback so a static deployment still works with zero configuration.
 */
export async function loadCatalog(options: LoadCatalogOptions): Promise<LoadCatalogResult> {
  try {
    const catalog = await requestCatalog(options);
    if (!catalog?.models?.length) throw new Error("empty catalogue");
    return { catalog, source: "api" };
  } catch (error) {
    if (options.keys.artificialAnalysis) {
      // The key rides in a header; a static host cannot have merged it. Fall back cleanly.
      console.warn("[som] live catalogue unavailable, using snapshot:", (error as Error).message);
    }
    const catalog = await requestSnapshot(options.signal);
    return { catalog, source: "snapshot" };
  }
}

export interface ProviderEndpoint {
  name: string;
  providerName: string;
  tag: string;
  quantization: string | null;
  contextLength: number | null;
  maxCompletionTokens: number | null;
  pricing: Record<string, string> | null;
  throughput: { p50: number; p75: number; p90: number; p99: number } | null;
  latency: { p50: number; p75: number; p90: number; p99: number } | null;
  uptime: { last5m: number | null; last30m: number | null; last1d: number | null };
  supportsImplicitCaching: boolean | null;
  status: number | null;
}

export async function fetchProviders(
  id: string,
  signal?: AbortSignal,
): Promise<ProviderEndpoint[]> {
  const [author, ...rest] = id.replace(/^~/, "").split(":")[0].split("/");
  const slug = rest.join("/");
  const response = await fetch(`${API_BASE}/providers/${author}/${slug}`, { signal });
  if (!response.ok) throw new Error(`provider lookup failed (${response.status})`);
  const json = (await response.json()) as { endpoints?: ProviderEndpoint[] };
  return json.endpoints ?? [];
}

export interface AccountInfo {
  key: {
    label: string | null;
    limit: number | null;
    limitRemaining: number | null;
    usage: number | null;
    usageMonthly: number | null;
    isFreeTier: boolean | null;
  } | null;
  credits: { total_credits: number; total_usage: number } | null;
}

export async function fetchAccount(orKey: string, signal?: AbortSignal): Promise<AccountInfo> {
  const headers: Record<string, string> = {};
  if (orKey) headers["x-or-key"] = orKey;
  const response = await fetch(`${API_BASE}/account`, { headers, signal });
  if (!response.ok) throw new Error(`account lookup failed (${response.status})`);
  return (await response.json()) as AccountInfo;
}

export async function fetchHealth(signal?: AbortSignal) {
  const response = await fetch(`${API_BASE}/health`, { signal });
  if (!response.ok) throw new Error("unhealthy");
  return (await response.json()) as { ok: boolean; hasEnvAaKey: boolean; hasEnvOrKey: boolean };
}

export type { AaFeed };

export type BenchmarkSource = "artificial-analysis" | "design-arena" | "openrouter";

export interface OrBenchmarkFeed {
  source: BenchmarkSource;
  asOf: string | null;
  citation: string | null;
  sourceUrl: string | null;
  version: string | null;
  modelCount: number;
  rows: Record<string, unknown>[];
}

/**
 * OpenRouter's own benchmark endpoint (AA indices, Design Arena rows and OpenRouter task
 * benchmarks). Needs the user's key; the request goes through our server so the key never
 * lands in a URL or a log line the browser can see.
 */
export async function fetchOrBenchmarks(
  orKey: string,
  source: BenchmarkSource,
  signal?: AbortSignal,
): Promise<OrBenchmarkFeed> {
  const headers: Record<string, string> = {};
  if (orKey) headers["x-or-key"] = orKey;
  const response = await fetch(`${API_BASE}/benchmarks?source=${source}`, { headers, signal });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      (json as { error?: string }).error ?? `Benchmark feed responded ${response.status}`,
    );
  }
  return json as OrBenchmarkFeed;
}
