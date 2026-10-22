import type { LlmModel } from "./types";

export interface ScoreWeights {
  quality: number;
  price: number;
  speed: number;
  context: number;
  cache: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  quality: 45,
  price: 25,
  speed: 12,
  context: 8,
  cache: 10,
};

export const WEIGHT_LABELS: { key: keyof ScoreWeights; label: string; hint: string }[] = [
  { key: "quality", label: "Quality", hint: "Intelligence index, falling back to coding then agentic" },
  { key: "price", label: "Cheapness", hint: "Lower blended price per 1M tokens ranks higher" },
  { key: "speed", label: "Speed", hint: "Median output tokens per second" },
  { key: "context", label: "Context", hint: "Size of the usable context window" },
  { key: "cache", label: "Cache", hint: "How much a cache hit saves versus the input price" },
];

export interface ScoreParts {
  score: number;
  quality: number | null;
  price: number | null;
  speed: number | null;
  context: number | null;
  cache: number | null;
  coverage: number;
}

/** Percentile rank of every value in the set (ECDF), 0..1. */
function percentileRanks(values: number[]): (value: number) => number {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return () => 0.5;
  return (value: number) => {
    let low = 0;
    let high = sorted.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (sorted[mid] < value) low = mid + 1;
      else high = mid;
    }
    return sorted.length === 1 ? 1 : low / (sorted.length - 1);
  };
}

function qualityOf(model: LlmModel): number | null {
  return (
    model.benchmarks.intelligence ??
    model.benchmarks.coding ??
    model.benchmarks.agentic ??
    model.benchmarks.math ??
    null
  );
}

/**
 * Fit score: a percentile-normalised blend of the five dimensions the user said they care
 * about. It is computed *within the current result set*, so it always answers
 * "which of these is best for me" rather than "which is best in absolute terms".
 */
export function computeFitScores(
  models: LlmModel[],
  weights: ScoreWeights,
): Map<string, ScoreParts> {
  const out = new Map<string, ScoreParts>();
  if (!models.length) return out;

  const qualityValues: number[] = [];
  const priceValues: number[] = [];
  const speedValues: number[] = [];
  const contextValues: number[] = [];
  const cacheValues: number[] = [];

  for (const model of models) {
    const quality = qualityOf(model);
    if (quality !== null) qualityValues.push(quality);
    if (model.pricing.blended !== null) priceValues.push(Math.log10(model.pricing.blended + 0.01));
    if (model.speed.outputTokensPerSecond !== null) speedValues.push(model.speed.outputTokensPerSecond);
    if (model.contextLength > 0) contextValues.push(Math.log10(model.contextLength));
    if (model.pricing.cacheDiscountPct !== null) cacheValues.push(model.pricing.cacheDiscountPct);
  }

  const qualityRank = percentileRanks(qualityValues);
  const priceRank = percentileRanks(priceValues);
  const speedRank = percentileRanks(speedValues);
  const contextRank = percentileRanks(contextValues);
  const cacheRank = percentileRanks(cacheValues);

  for (const model of models) {
    const quality = qualityOf(model);
    const price = model.pricing.blended;
    const speed = model.speed.outputTokensPerSecond;
    const context = model.contextLength;

    const parts = {
      quality: quality === null ? null : qualityRank(quality),
      price: price === null ? null : 1 - priceRank(Math.log10(price + 0.01)),
      speed: speed === null ? null : speedRank(speed),
      context: context > 0 ? contextRank(Math.log10(context)) : null,
      cache:
        model.pricing.cacheDiscountPct === null ? null : cacheRank(model.pricing.cacheDiscountPct),
    };

    let weighted = 0;
    let used = 0;
    let coverage = 0;
    for (const key of Object.keys(parts) as (keyof typeof parts)[]) {
      const weight = weights[key];
      if (weight <= 0) continue;
      const value = parts[key];
      // Unknown data scores neutrally rather than as zero — absence is not badness.
      const normalized = value === null ? 0.5 : value;
      if (value !== null) coverage += 1;
      weighted += normalized * weight;
      used += weight;
    }

    out.set(model.id, {
      score: used ? Math.round((weighted / used) * 1000) / 10 : 0,
      ...parts,
      coverage: coverage / 5,
    });
  }
  return out;
}

export interface ParetoPoint {
  id: string;
  price: number;
  quality: number;
}

/**
 * Models that no other model beats on *both* price and quality. These are the only
 * defensible picks, so the scatter highlights them.
 */
export function paretoFrontier(models: LlmModel[]): Set<string> {
  const points: ParetoPoint[] = [];
  for (const model of models) {
    const price = model.pricing.blended;
    const quality = qualityOf(model);
    if (price === null || quality === null) continue;
    points.push({ id: model.id, price: Math.max(price, 0.0001), quality });
  }
  points.sort((a, b) => a.price - b.price || b.quality - a.quality);
  const frontier = new Set<string>();
  let bestQuality = -1;
  for (const point of points) {
    if (point.quality > bestQuality) {
      frontier.add(point.id);
      bestQuality = point.quality;
    }
  }
  return frontier;
}

export interface Recommendation {
  id: string;
  title: string;
  rationale: string;
  model: LlmModel;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Three opinionated picks that summarise the current result set. */
export function recommend(
  models: LlmModel[],
  fitScores: Map<string, ScoreParts>,
): Recommendation[] {
  if (!models.length) return [];
  const picks: Recommendation[] = [];
  const used = new Set<string>();

  const withQuality = models.filter((m) => m.benchmarks.intelligence !== null);
  const withPrice = models.filter((m) => m.pricing.blended !== null);

  const bestSom = [...models]
    .filter((m) => fitScores.has(m.id))
    .sort((a, b) => (fitScores.get(b.id)?.score ?? 0) - (fitScores.get(a.id)?.score ?? 0))[0];
  if (bestSom) {
    used.add(bestSom.id);
    picks.push({
      id: "best-overall",
      title: "Best for your weights",
      rationale: `Top fit score in this set (${fitScores.get(bestSom.id)?.score ?? 0}).`,
      model: bestSom,
    });
  }

  const valueRanked = withQuality
    .filter((m) => m.pricing.blended !== null && m.pricing.blended > 0)
    .map((m) => ({
      model: m,
      value: (m.benchmarks.intelligence ?? 0) / (m.pricing.blended ?? 1),
    }))
    .sort((a, b) => b.value - a.value);
  const bestValue = valueRanked.find((entry) => !used.has(entry.model.id));
  if (bestValue) {
    used.add(bestValue.model.id);
    picks.push({
      id: "best-value",
      title: "Most quality per dollar",
      rationale: `${bestValue.model.benchmarks.intelligence?.toFixed(1)} intelligence at $${bestValue.model.pricing.blended?.toFixed(2)}/1M blended.`,
      model: bestValue.model,
    });
  }

  const medianQuality = median(withQuality.map((m) => m.benchmarks.intelligence ?? 0));
  const cheapCapable = withPrice
    .filter((m) => (m.benchmarks.intelligence ?? 0) >= medianQuality)
    .sort((a, b) => (a.pricing.blended ?? 0) - (b.pricing.blended ?? 0))
    .find((m) => !used.has(m.id));
  if (cheapCapable) {
    picks.push({
      id: "cheapest-capable",
      title: "Cheapest above median",
      rationale: `Clears the ${medianQuality.toFixed(1)} median intelligence at $${cheapCapable.pricing.blended?.toFixed(2)}/1M.`,
      model: cheapCapable,
    });
  }

  const cacheIdle = models
    .filter((m) => m.pricing.cacheDiscountPct !== null && m.pricing.cacheDiscountPct > 0)
    .sort(
      (a, b) =>
        (b.pricing.cacheDiscountPct ?? 0) * (b.benchmarks.intelligence ?? 0) -
        (a.pricing.cacheDiscountPct ?? 0) * (a.benchmarks.intelligence ?? 0),
    )[0];
  if (cacheIdle && picks.length < 4 && !used.has(cacheIdle.id)) {
    picks.push({
      id: "cache-hero",
      title: "Best cached workflow",
      rationale: `Cache hits are ${cacheIdle.pricing.cacheDiscountPct?.toFixed(0)}% cheaper than fresh input.`,
      model: cacheIdle,
    });
  }

  return picks;
}
