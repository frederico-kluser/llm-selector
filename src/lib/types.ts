/** Shared catalogue types — mirrors `public/data/catalog.json` and the runtime API payloads. */

export type Modality = "text" | "image" | "audio" | "video" | "file";
export type OutputModality = "text" | "image" | "audio" | "embeddings";
export type Openness = "open" | "closed" | "unknown";
export type Variant = "standard" | "free" | "batch" | "alias" | "router";
export type MatchConfidence = "high" | "medium" | "low";

export interface Pricing {
  /** USD per 1M tokens. `null` means "not published / not applicable". */
  prompt: number | null;
  completion: number | null;
  cacheRead: number | null;
  cacheWrite: number | null;
  cacheWrite1h: number | null;
  image: number | null;
  audio: number | null;
  webSearch: number | null;
  /** 3:1 input:output blend, USD per 1M tokens. */
  blended: number | null;
  /** Whole percent cheaper than the base input price when the cache hits. */
  cacheDiscountPct: number | null;
}

export interface BenchmarkScores {
  intelligence: number | null;
  coding: number | null;
  math: number | null;
  agentic: number | null;
  terminalbench: number | null;
  livecodebench: number | null;
  scicode: number | null;
  gpqa: number | null;
  mmluPro: number | null;
  hle: number | null;
  aime: number | null;
  math500: number | null;
  ifbench: number | null;
  lcr: number | null;
  tau2: number | null;
  tauBanking: number | null;
  finance: number | null;
  strategy: number | null;
  legal: number | null;
  healthcare: number | null;
  engineering: number | null;
  economics: number | null;
}

export type BenchmarkKey = keyof BenchmarkScores;

export interface BenchmarkDef {
  key: BenchmarkKey;
  label: string;
  short: string;
  source: string;
  description: string;
  family: "core" | "coding" | "knowledge" | "math" | "agentic" | "domain";
  /** Which Artificial Analysis tier actually returns this axis. */
  availability: "free" | "pro" | "legacy";
  /** Number of catalogue models with a value (filled at runtime). */
  coverage?: number;
}

export interface AaInfo {
  slug: string;
  name: string;
  creator: string;
  releaseDate: string | null;
  matchedBy: string;
  confidence: MatchConfidence;
  pricing: {
    input: number | null;
    output: number | null;
    cacheHit: number | null;
    cacheWrite: number | null;
  };
  speed: {
    outputTokensPerSecond: number | null;
    ttftSeconds: number | null;
    ttfaSeconds: number | null;
    endToEndSeconds: number | null;
  };
  /** Which AA tier supplied the row: `free` = indices v4.x, `legacy` = pre-migration feed. */
  tier?: "free" | "pro" | "legacy" | null;
  /** Which raw AA field supplied each score, for provenance tooltips. */
  provenance: Partial<Record<BenchmarkKey, string>>;
}

export interface LlmModel {
  id: string;
  cleanId: string;
  slug: string;
  name: string;
  author: string;
  authorLabel: string;
  creator: string;
  variant: Variant;
  aliasTarget: { name: string; slug: string } | null;
  created: string | null;
  contextLength: number;
  maxOutputTokens: number | null;
  pricing: Pricing;
  modalities: { input: Modality[]; output: OutputModality[] };
  openness: Openness;
  opennessReason: "huggingface" | "description" | "lab" | "none";
  huggingFaceId: string | null;
  knowledgeCutoff: string | null;
  deprecated: boolean;
  reasoning: { mandatory?: boolean; default_enabled?: boolean; supported_efforts?: string[] } | null;
  supportedParameters: string[];
  features: string[];
  benchmarks: BenchmarkScores;
  benchmarkSources: Partial<Record<BenchmarkKey, "artificial-analysis" | "openrouter" | null>>;
  aa: AaInfo | null;
  speed: { outputTokensPerSecond: number | null; ttftSeconds: number | null };
}

export interface CreatorSummary {
  id: string;
  label: string;
  count: number;
  open: number;
  bestIntelligence: number | null;
}

export interface CatalogSource {
  id: string;
  label: string;
  url: string;
  count: number;
  fetchedAt: string | null;
  license?: string;
}

export interface CatalogFeed {
  tier: "free" | "pro" | "legacy";
  intelligenceIndexVersion: number | null;
  fetchedAt: string;
  rows: number;
}

export interface Catalog {
  version: number;
  generatedAt: string;
  sources: CatalogSource[];
  benchmarks: BenchmarkDef[];
  models: LlmModel[];
  feed?: CatalogFeed | null;
  creators: CreatorSummary[];
  bounds: {
    prompt: [number, number];
    cacheRead: [number, number];
    context: [number, number];
    created: [string | null, string | null];
  };
  stats: {
    models: number;
    withBenchmarks: number;
    joinRate: number;
    open: number;
    closed: number;
    unknown: number;
    free: number;
    withCache: number;
    deprecated: number;
    byModality: Record<string, number>;
    aaMatchedExactly: number;
  };
}

/** Raw Artificial Analysis row, normalized across the legacy and the v2 language tiers. */
export interface AaRow {
  slug: string;
  name: string;
  creator: string;
  creatorName: string;
  releaseDate: string | null;
  scores: Partial<Record<BenchmarkKey, number>>;
  provenance: Partial<Record<BenchmarkKey, string>>;
  pricing: AaInfo["pricing"];
  speed: AaInfo["speed"];
  intelligenceIndexVersion: number | null;
  tier: "free" | "pro" | "legacy";
}

export interface AaFeed {
  tier: "free" | "pro" | "legacy";
  intelligenceIndexVersion: number | null;
  fetchedAt: string;
  rows: AaRow[];
}
