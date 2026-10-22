import { DEFAULT_FILTERS, type Filters, type Sort } from "./filter";
import { DEFAULT_WEIGHTS, type ScoreWeights } from "./scoring";

export interface StarterPreset {
  id: string;
  name: string;
  description: string;
  filters: Filters;
  sort: Sort;
  weights: ScoreWeights;
}

function preset(
  id: string,
  name: string,
  description: string,
  filters: Partial<Filters>,
  sort: Sort = { key: "som", dir: -1 },
  weights: ScoreWeights = DEFAULT_WEIGHTS,
): StarterPreset {
  return {
    id,
    name,
    description,
    filters: {
      ...DEFAULT_FILTERS,
      ...filters,
      input: { ...DEFAULT_FILTERS.input, ...(filters.input ?? {}) },
      price: { ...DEFAULT_FILTERS.price, ...(filters.price ?? {}) },
      cache: { ...DEFAULT_FILTERS.cache, ...(filters.cache ?? {}) },
    },
    sort,
    weights,
  };
}

export const STARTER_PRESETS: StarterPreset[] = [
  preset(
    "starter-coding-agent",
    "Coding agent",
    "Open or closed, tools + long context, ranked by coding and agentic strength.",
    {
      input: { mode: "all", values: ["text"] },
      minContext: 128_000,
      features: ["tools"],
      mins: { coding: 40 },
    },
    { key: "coding", dir: -1 },
    { quality: 55, price: 15, speed: 15, context: 5, cache: 10 },
  ),
  preset(
    "starter-cheap-extraction",
    "Cheap extraction",
    "Anything under $1 blended that still scores, so you can run it at volume.",
    { price: { min: 0, max: 1, axis: "blended", includeUnpriced: false, freeOnly: false } },
    { key: "value", dir: -1 },
    { quality: 25, price: 55, speed: 10, context: 0, cache: 10 },
  ),
  preset(
    "starter-multimodal",
    "Multimodal assistant",
    "Accepts image, audio and video input in one model.",
    { input: { mode: "all", values: ["image", "audio"] } },
    { key: "intelligence", dir: -1 },
    { quality: 50, price: 20, speed: 10, context: 10, cache: 10 },
  ),
  preset(
    "starter-open-long-context",
    "Open weights, long context",
    "Open-weight models only, at least 200K context, with prompt caching priced.",
    {
      weights: "open",
      minContext: 200_000,
      cache: { require: true, max: 5, minDiscount: 50 },
    },
    { key: "som", dir: -1 },
    { quality: 45, price: 20, speed: 5, context: 20, cache: 10 },
  ),
  preset(
    "starter-cache-heavy",
    "Cache-heavy workload",
    "For long system prompts: only models where a cache hit saves at least 70%.",
    { cache: { require: true, max: 2, minDiscount: 70 } },
    { key: "cacheRead", dir: 1 },
    { quality: 35, price: 15, speed: 5, context: 15, cache: 30 },
  ),
];
