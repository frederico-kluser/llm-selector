import type { BenchmarkKey, LlmModel, Modality, OutputModality } from "./types";

export type PriceAxis = "blended" | "prompt" | "completion";
export type WeightsMode = "any" | "open" | "closed";
export type InputMode = "all" | "any";

export interface Filters {
  q: string;
  input: { mode: InputMode; values: Modality[] };
  output: OutputModality[];
  /** Strict "text in, text out and nothing else" predicate. */
  textOnly: boolean;
  weights: WeightsMode;
  price: { min: number; max: number; axis: PriceAxis; includeUnpriced: boolean; freeOnly: boolean };
  cache: { require: boolean; max: number; minDiscount: number };
  minContext: number;
  /** Minimum OpenRouter Design Arena Elo (0 = off). */
  minArenaElo: number;
  mins: Partial<Record<BenchmarkKey, number>>;
  requireScored: boolean;
  features: string[];
  creators: string[];
  maxAgeDays: number;
  hideDeprecated: boolean;
  hideAliases: boolean;
  hideBatch: boolean;
  hideFree: boolean;
}

export const PRICE_AXES: { id: PriceAxis; label: string; hint: string }[] = [
  { id: "blended", label: "Blended", hint: "3:1 input:output mix, USD per 1M tokens" },
  { id: "prompt", label: "Input", hint: "USD per 1M input tokens" },
  { id: "completion", label: "Output", hint: "USD per 1M output tokens" },
];

export const DEFAULT_FILTERS: Filters = {
  q: "",
  input: { mode: "all", values: [] },
  output: [],
  textOnly: false,
  weights: "any",
  price: { min: 0, max: 5000, axis: "blended", includeUnpriced: true, freeOnly: false },
  cache: { require: false, max: 5000, minDiscount: 0 },
  minContext: 0,
  minArenaElo: 0,
  mins: {},
  requireScored: false,
  features: [],
  creators: [],
  maxAgeDays: 0,
  hideDeprecated: true,
  hideAliases: true,
  hideBatch: true,
  hideFree: false,
};

export type SortKey =
  | "som"
  | "intelligence"
  | "coding"
  | "agentic"
  | "price"
  | "cacheRead"
  | "contextLength"
  | "created"
  | "name"
  | "speed"
  | "value";

export interface Sort {
  key: SortKey;
  dir: 1 | -1;
}

export const DEFAULT_SORT: Sort = { key: "som", dir: -1 };

export const SORT_LABELS: Record<SortKey, string> = {
  som: "Fit score",
  intelligence: "Intelligence",
  coding: "Coding",
  agentic: "Agentic",
  price: "Blended price",
  cacheRead: "Cache read price",
  contextLength: "Context",
  created: "Release date",
  name: "Name",
  speed: "Throughput",
  value: "Quality per $",
};

export type FacetId =
  | "input"
  | "output"
  | "weights"
  | "price"
  | "cache"
  | "context"
  | "mins"
  | "features"
  | "creators"
  | "age"
  | "arena"
  | "q";

function priceFor(model: LlmModel, axis: PriceAxis): number | null {
  if (axis === "prompt") return model.pricing.prompt;
  if (axis === "completion") return model.pricing.completion;
  return model.pricing.blended;
}

/** True when the model satisfies every constraint except the ignored facet. */
export function matches(
  model: LlmModel,
  filters: Filters,
  ignore?: FacetId,
  now = Date.now(),
): boolean {
  if (ignore !== "q" && filters.q.trim()) {
    const needle = filters.q.trim().toLowerCase();
    const haystack = `${model.name} ${model.id} ${model.authorLabel} ${model.slug}`.toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  if (filters.hideDeprecated && model.deprecated) return false;
  if (filters.hideAliases && model.variant === "alias") return false;
  if (filters.hideBatch && model.variant === "batch") return false;
  if (filters.hideFree && model.variant === "free") return false;

  if (ignore !== "input" && filters.input.values.length) {
    const selected = filters.input.values;
    const has = (m: Modality) => model.modalities.input.includes(m);
    if (filters.input.mode === "all" ? !selected.every(has) : !selected.some(has)) return false;
  }

  if (ignore !== "output" && filters.output.length) {
    if (!filters.output.every((m) => model.modalities.output.includes(m))) return false;
  }

  if (filters.textOnly) {
    const outs = model.modalities.output;
    if (!(model.modalities.input.length === 1 && model.modalities.input[0] === "text")) return false;
    if (!(outs.length === 1 && outs[0] === "text")) return false;
  }

  if (filters.textOnly) {
    const onlyText =
      model.modalities.input.length === 1 &&
      model.modalities.input[0] === "text" &&
      model.modalities.output.length === 1 &&
      model.modalities.output[0] === "text";
    if (!onlyText) return false;
  }

  if (ignore !== "weights" && filters.weights !== "any") {
    // Exact matching — never fold "unknown" into proprietary, or the facet counts lie.
    if (model.openness !== filters.weights) return false;
  }

  if (ignore !== "price") {
    const { price } = filters;
    if (price.freeOnly) {
      if (!(model.pricing.prompt === 0 && model.pricing.completion === 0)) return false;
    } else {
      const value = priceFor(model, price.axis);
      if (value === null) {
        if (!price.includeUnpriced) return false;
      } else {
        if (value < price.min) return false;
        if (value > price.max) return false;
      }
    }
  }

  if (ignore !== "cache") {
    const { cache } = filters;
    if (cache.require && model.pricing.cacheRead === null) return false;
    if (cache.require && model.pricing.cacheRead !== null && model.pricing.cacheRead > cache.max)
      return false;
    if (
      cache.minDiscount > 0 &&
      (model.pricing.cacheDiscountPct === null ||
        model.pricing.cacheDiscountPct < cache.minDiscount)
    )
      return false;
  }

  if (ignore !== "context" && filters.minContext > 0) {
    if (model.contextLength < filters.minContext) return false;
  }

  if (ignore !== "arena" && filters.minArenaElo > 0) {
    const arena = model.designArena;
    if (!arena || arena.bestElo < filters.minArenaElo) return false;
  }

  if (ignore !== "mins") {
    if (filters.requireScored) {
      const scored = Object.values(model.benchmarks).some((v) => v !== null);
      if (!scored) return false;
    }
    for (const [key, minimum] of Object.entries(filters.mins) as [BenchmarkKey, number][]) {
      if (!minimum) continue;
      const value = model.benchmarks[key];
      if (value === null || value < minimum) return false;
    }
  }

  if (ignore !== "features" && filters.features.length) {
    if (!filters.features.every((f) => model.features.includes(f))) return false;
  }

  if (ignore !== "creators" && filters.creators.length) {
    if (!filters.creators.includes(model.creator)) return false;
  }

  if (ignore !== "age" && filters.maxAgeDays > 0) {
    if (!model.created) return false;
    const ageDays = (now - new Date(model.created).getTime()) / 86_400_000;
    if (ageDays > filters.maxAgeDays) return false;
  }

  return true;
}

export function applyFilters(models: LlmModel[], filters: Filters): LlmModel[] {
  const now = Date.now();
  return models.filter((model) => matches(model, filters, undefined, now));
}

export interface FacetCounts {
  input: Record<string, number>;
  output: Record<string, number>;
  weights: Record<string, number>;
  features: Record<string, number>;
  creators: Record<string, number>;
}

/** Self-excluding facet counts: each value is counted with all *other* facets applied. */
export function facetCounts(models: LlmModel[], filters: Filters): FacetCounts {
  const now = Date.now();
  const counts: FacetCounts = { input: {}, output: {}, weights: {}, features: {}, creators: {} };

  for (const model of models) {
    if (matches(model, filters, "input", now)) {
      for (const modality of model.modalities.input) {
        counts.input[modality] = (counts.input[modality] ?? 0) + 1;
      }
    }
    if (matches(model, filters, "output", now)) {
      for (const modality of model.modalities.output) {
        counts.output[modality] = (counts.output[modality] ?? 0) + 1;
      }
    }
    if (matches(model, filters, "weights", now)) {
      counts.weights[model.openness] = (counts.weights[model.openness] ?? 0) + 1;
    }
    if (matches(model, filters, "features", now)) {
      for (const feature of model.features) {
        counts.features[feature] = (counts.features[feature] ?? 0) + 1;
      }
    }
    if (matches(model, filters, "creators", now)) {
      counts.creators[model.creator] = (counts.creators[model.creator] ?? 0) + 1;
    }
  }
  return counts;
}

export function valueOf(model: LlmModel, sortKey: SortKey, somScore?: number): number | string | null {
  switch (sortKey) {
    case "name":
      return model.name.toLowerCase();
    case "som":
      return somScore ?? null;
    case "price":
      return model.pricing.blended;
    case "cacheRead":
      return model.pricing.cacheRead;
    case "contextLength":
      return model.contextLength;
    case "created":
      return model.created ? new Date(model.created).getTime() : null;
    case "speed":
      return model.speed.outputTokensPerSecond;
    case "value": {
      const quality = model.benchmarks.intelligence;
      const price = model.pricing.blended;
      if (quality === null || price === null) return null;
      return quality / (price + 0.05);
    }
    default: {
      const score = model.benchmarks[sortKey as BenchmarkKey];
      return score ?? null;
    }
  }
}

export function sortModels(
  models: LlmModel[],
  sort: Sort,
  fitScores: Map<string, number> = new Map(),
): LlmModel[] {
  const sorted = [...models];
  sorted.sort((a, b) => {
    const av = valueOf(a, sort.key, fitScores.get(a.id));
    const bv = valueOf(b, sort.key, fitScores.get(b.id));
    // Missing data always sinks, regardless of direction — never sort `null` as zero.
    if (av === null && bv === null) return a.name.localeCompare(b.name);
    if (av === null) return 1;
    if (bv === null) return -1;
    if (typeof av === "string" || typeof bv === "string") {
      return String(av).localeCompare(String(bv)) * sort.dir;
    }
    if (av === bv) return a.name.localeCompare(b.name);
    return (av < bv ? -1 : 1) * sort.dir;
  });
  return sorted;
}

export interface ActiveChip {
  id: string;
  label: string;
  facet: FacetId;
  clear: (filters: Filters) => Filters;
}

export function activeChips(filters: Filters, modelCount = 0): ActiveChip[] {
  const chips: ActiveChip[] = [];
  if (filters.textOnly) {
    chips.push({
      id: "textOnly",
      label: "text in / text out only",
      facet: "input",
      clear: (f) => ({ ...f, textOnly: false }),
    });
  }
  if (filters.q.trim()) {
    chips.push({
      id: "q",
      label: `“${filters.q.trim()}”`,
      facet: "q",
      clear: (f) => ({ ...f, q: "" }),
    });
  }
  for (const modality of filters.input.values) {
    chips.push({
      id: `input:${modality}`,
      label: `${filters.input.mode === "any" ? "any of" : "input"} ${modality}`,
      facet: "input",
      clear: (f) => ({
        ...f,
        input: { ...f.input, values: f.input.values.filter((m) => m !== modality) },
      }),
    });
  }
  for (const modality of filters.output) {
    chips.push({
      id: `output:${modality}`,
      label: `output ${modality}`,
      facet: "output",
      clear: (f) => ({ ...f, output: f.output.filter((m) => m !== modality) }),
    });
  }
  if (filters.weights !== "any") {
    chips.push({
      id: "weights",
      label: filters.weights === "open" ? "open weights" : "proprietary",
      facet: "weights",
      clear: (f) => ({ ...f, weights: "any" }),
    });
  }
  if (filters.price.freeOnly) {
    chips.push({
      id: "free",
      label: "free only",
      facet: "price",
      clear: (f) => ({ ...f, price: { ...f.price, freeOnly: false } }),
    });
  } else if (filters.price.min > 0 || filters.price.max < 5000) {
    const axisLabel =
      filters.price.axis === "blended" ? "blended" : filters.price.axis === "prompt" ? "input" : "output";
    chips.push({
      id: "price",
      label: `${axisLabel} $${filters.price.min.toFixed(2)}–$${filters.price.max.toFixed(2)}/1M`,
      facet: "price",
      clear: (f) => ({ ...f, price: { ...f.price, min: 0, max: 5000 } }),
    });
  }
  if (filters.cache.require) {
    chips.push({
      id: "cache",
      label: `cache read ≤ $${filters.cache.max}/1M`,
      facet: "cache",
      clear: (f) => ({ ...f, cache: { ...f.cache, require: false } }),
    });
  }
  if (filters.cache.minDiscount > 0) {
    chips.push({
      id: "cache-discount",
      label: `cache saves ≥ ${filters.cache.minDiscount}%`,
      facet: "cache",
      clear: (f) => ({ ...f, cache: { ...f.cache, minDiscount: 0 } }),
    });
  }
  if (filters.minContext > 0) {
    chips.push({
      id: "context",
      label: `context ≥ ${filters.minContext >= 1000 ? `${Math.round(filters.minContext / 1000)}K` : filters.minContext}`,
      facet: "context",
      clear: (f) => ({ ...f, minContext: 0 }),
    });
  }
  if (filters.minArenaElo > 0) {
    chips.push({
      id: "arena",
      label: `Design Arena ≥ ${filters.minArenaElo} Elo`,
      facet: "arena",
      clear: (f) => ({ ...f, minArenaElo: 0 }),
    });
  }
  for (const [key, minimum] of Object.entries(filters.mins) as [BenchmarkKey, number][]) {
    if (!minimum) continue;
    chips.push({
      id: `min:${key}`,
      label: `${key} ≥ ${minimum}`,
      facet: "mins",
      clear: (f) => {
        const next = { ...f.mins };
        delete next[key];
        return { ...f, mins: next };
      },
    });
  }
  if (filters.requireScored) {
    chips.push({
      id: "scored",
      label: "benchmarked only",
      facet: "mins",
      clear: (f) => ({ ...f, requireScored: false }),
    });
  }
  for (const feature of filters.features) {
    chips.push({
      id: `feature:${feature}`,
      label: feature.replace(/_/g, " "),
      facet: "features",
      clear: (f) => ({ ...f, features: f.features.filter((x) => x !== feature) }),
    });
  }
  for (const creator of filters.creators) {
    chips.push({
      id: `creator:${creator}`,
      label: creator,
      facet: "creators",
      clear: (f) => ({ ...f, creators: f.creators.filter((c) => c !== creator) }),
    });
  }
  if (filters.maxAgeDays > 0) {
    chips.push({
      id: "age",
      label: `released in ${filters.maxAgeDays}d`,
      facet: "age",
      clear: (f) => ({ ...f, maxAgeDays: 0 }),
    });
  }
  if (modelCount === 0) {
    // kept for callers that want to render a "no results" chip state
  }
  return chips;
}

export interface Diagnosis {
  label: string;
  removed: number;
  filter: (f: Filters) => Filters;
}

/**
 * When the result set is empty, rank constraints by how many models removing each one
 * would recover. Answers "why is it empty" with evidence instead of a dead end.
 */
export function diagnose(models: LlmModel[], filters: Filters): Diagnosis[] {
  const chips = activeChips(filters);
  const now = Date.now();
  const results: Diagnosis[] = [];
  for (const chip of chips) {
    const relaxed = chip.clear(filters);
    const count = models.filter((m) => matches(m, relaxed, undefined, now)).length;
    if (count > 0) {
      results.push({ label: chip.label, removed: count, filter: chip.clear });
    }
  }
  return results.sort((a, b) => b.removed - a.removed).slice(0, 4);
}

export function countActiveFilters(filters: Filters): number {
  return activeChips(filters).length;
}
