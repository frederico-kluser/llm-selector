import { z } from "zod";

import { DEFAULT_FILTERS, DEFAULT_SORT, type Filters, type Sort } from "./filter";
import { DEFAULT_WEIGHTS, type ScoreWeights } from "./scoring";

export const CONFIG_VERSION = 1;
export const APP_ID = "llm-selector";

const modalitySchema = z.enum(["text", "image", "audio", "video", "file"]);
const outputSchema = z.enum(["text", "image", "audio", "embeddings"]);
export const filtersSchema = z.object({
  q: z.string().default(""),
  input: z
    .object({
      mode: z.enum(["all", "any"]).default("all"),
      values: z.array(modalitySchema).default([]),
    })
    .default({ mode: "all", values: [] }),
  output: z.array(outputSchema).default([]),
  textOnly: z.boolean().default(false),
  weights: z.enum(["any", "open", "closed"]).default("any"),
  price: z
    .object({
      min: z.number().min(0).default(0),
      max: z.number().min(0).default(5000),
      axis: z.enum(["blended", "prompt", "completion"]).default("blended"),
      includeUnpriced: z.boolean().default(true),
      freeOnly: z.boolean().default(false),
    })
    .default({
      min: 0,
      max: 5000,
      axis: "blended",
      includeUnpriced: true,
      freeOnly: false,
    }),
  cache: z
    .object({
      require: z.boolean().default(false),
      max: z.number().min(0).default(5000),
      minDiscount: z.number().min(0).max(100).default(0),
    })
    .default({ require: false, max: 5000, minDiscount: 0 }),
  minContext: z.number().min(0).default(0),
  mins: z.record(z.string(), z.number()).default({}),
  requireScored: z.boolean().default(false),
  features: z.array(z.string()).default([]),
  creators: z.array(z.string()).default([]),
  maxAgeDays: z.number().min(0).default(0),
  hideDeprecated: z.boolean().default(true),
  hideAliases: z.boolean().default(false),
  hideBatch: z.boolean().default(false),
  hideFree: z.boolean().default(false),
});

export const sortSchema = z.object({
  key: z
    .enum([
      "som",
      "intelligence",
      "coding",
      "agentic",
      "price",
      "cacheRead",
      "contextLength",
      "created",
      "name",
      "speed",
      "value",
    ])
    .default("som"),
  dir: z.union([z.literal(1), z.literal(-1)]).default(-1),
});

export const weightsSchema = z.object({
  quality: z.number().min(0).max(100).default(DEFAULT_WEIGHTS.quality),
  price: z.number().min(0).max(100).default(DEFAULT_WEIGHTS.price),
  speed: z.number().min(0).max(100).default(DEFAULT_WEIGHTS.speed),
  context: z.number().min(0).max(100).default(DEFAULT_WEIGHTS.context),
  cache: z.number().min(0).max(100).default(DEFAULT_WEIGHTS.cache),
});

export const presetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  description: z.string().max(200).optional().default(""),
  createdAt: z.string().optional(),
  filters: filtersSchema.partial().optional(),
  sort: sortSchema.partial().optional(),
  weights: weightsSchema.partial().optional(),
  /** Preserved verbatim so a future SOM can read presets written by an older one. */
  _ext: z.record(z.string(), z.unknown()).optional(),
});

const configShape = z.object({
  $schema: z.string().optional(),
  app: z.string().optional(),
  version: z.number().int().optional(),
  exportedAt: z.string().optional(),
  view: z.enum(["explore", "compare", "presets"]).optional(),
  filters: filtersSchema.partial().optional(),
  sort: sortSchema.partial().optional(),
  weights: weightsSchema.partial().optional(),
  selected: z.array(z.string()).optional(),
  presets: z.array(presetSchema).optional(),
  _ext: z.record(z.string(), z.unknown()).optional(),
});

/** A JSON blob that contains none of our keys is not a SOM config, whatever else it is. */
export const configSchema = configShape.refine(
  (value) =>
    value.app !== undefined ||
    value.version !== undefined ||
    value.filters !== undefined ||
    value.sort !== undefined ||
    value.weights !== undefined ||
    value.selected !== undefined ||
    (value.presets !== undefined && value.presets.length > 0),
  { message: "Not a SOM config: no filters, presets or settings found" },
);

export type Preset = {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  filters: Filters;
  sort: Sort;
  weights: ScoreWeights;
};

export type ImportedConfig = z.infer<typeof configSchema>;

export function makePreset(
  name: string,
  filters: Filters,
  sort: Sort,
  weights: ScoreWeights,
  description = "",
): Preset {
  return {
    id: `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: name.slice(0, 80),
    description: description.slice(0, 200),
    createdAt: new Date().toISOString(),
    filters,
    sort,
    weights,
  };
}

export function mergeFilters(partial: unknown): Filters {
  const parsed = filtersSchema.partial().safeParse(partial ?? {});
  if (!parsed.success) return { ...DEFAULT_FILTERS };
  return {
    ...DEFAULT_FILTERS,
    ...parsed.data,
    input: { ...DEFAULT_FILTERS.input, ...(parsed.data.input ?? {}) },
    price: { ...DEFAULT_FILTERS.price, ...(parsed.data.price ?? {}) },
    cache: { ...DEFAULT_FILTERS.cache, ...(parsed.data.cache ?? {}) },
    mins: { ...(parsed.data.mins ?? {}) } as Filters["mins"],
  } as Filters;
}

export function mergeSort(partial: unknown): Sort {
  const parsed = sortSchema.partial().safeParse(partial ?? {});
  if (!parsed.success) return { ...DEFAULT_SORT };
  return {
    key: parsed.data.key ?? DEFAULT_SORT.key,
    dir: parsed.data.dir === 1 ? 1 : parsed.data.dir === -1 ? -1 : DEFAULT_SORT.dir,
  };
}

export function mergeWeights(partial: unknown): ScoreWeights {
  const parsed = weightsSchema.partial().safeParse(partial ?? {});
  if (!parsed.success) return { ...DEFAULT_WEIGHTS };
  return { ...DEFAULT_WEIGHTS, ...parsed.data } as ScoreWeights;
}

export interface BuildConfigArgs {
  filters: Filters;
  sort: Sort;
  weights: ScoreWeights;
  view: string;
  selected: string[];
  presets: Preset[];
}

export function buildConfig({
  filters,
  sort,
  weights,
  view,
  selected,
  presets,
}: BuildConfigArgs) {
  return {
    $schema: "https://raw.githubusercontent.com/frederico-kluser/llm-selector/main/config.schema.json",
    app: APP_ID,
    version: CONFIG_VERSION,
    exportedAt: new Date().toISOString(),
    view,
    filters,
    sort,
    weights,
    selected,
    presets: presets.map((preset) => ({
      id: preset.id,
      name: preset.name,
      description: preset.description ?? "",
      createdAt: preset.createdAt,
      filters: preset.filters,
      sort: preset.sort,
      weights: preset.weights,
    })),
  };
}

export type ImportStatus = "new" | "update" | "unchanged" | "invalid";

export interface ImportResult {
  config: ImportedConfig;
  groups: Record<ImportStatus, Preset[]>;
  skipped: { name: string; reason: string }[];
}

/**
 * Import is a merge with a diff, never a silent replace. Presets are matched by name;
 * changed ones become updates, identical ones are untouched, and conflicts default to
 * "keep both" so an import can never destroy local curation.
 */
export function importConfig(
  raw: unknown,
  existing: Preset[],
  { mode = "keep-both" }: { mode?: "keep-both" | "replace" } = {},
): ImportResult {
  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      config: {},
      groups: { new: [], update: [], unchanged: [], invalid: [] },
      skipped: [{ name: "config", reason: parsed.error.issues[0]?.message ?? "invalid JSON shape" }],
    };
  }
  const config = parsed.data;
  const byName = new Map(existing.map((preset) => [preset.name.toLowerCase(), preset]));
  const groups: Record<ImportStatus, Preset[]> = { new: [], update: [], unchanged: [], invalid: [] };
  const skipped: { name: string; reason: string }[] = [];

  for (const entry of config.presets ?? []) {
    const candidate: Preset = {
      id: entry.id || `p_${Math.random().toString(36).slice(2, 9)}`,
      name: entry.name,
      description: entry.description ?? "",
      createdAt: entry.createdAt ?? new Date().toISOString(),
      filters: mergeFilters(entry.filters),
      sort: mergeSort(entry.sort),
      weights: mergeWeights(entry.weights),
    };
    const found = byName.get(candidate.name.toLowerCase());
    if (!found) {
      groups.new.push(candidate);
      continue;
    }
    const same =
      JSON.stringify(found.filters) === JSON.stringify(candidate.filters) &&
      JSON.stringify(found.sort) === JSON.stringify(candidate.sort) &&
      JSON.stringify(found.weights) === JSON.stringify(candidate.weights);
    if (same) {
      groups.unchanged.push(found);
    } else if (mode === "replace") {
      groups.update.push({ ...candidate, id: found.id });
    } else {
      groups.new.push({
        ...candidate,
        id: `p_${Math.random().toString(36).slice(2, 9)}`,
        name: `${candidate.name} (imported)`.slice(0, 80),
      });
    }
  }

  return { config, groups, skipped };
}

export function presetFromConfig(config: ImportedConfig, name = "Imported selection"): Preset {
  return makePreset(
    name,
    mergeFilters(config.filters),
    mergeSort(config.sort),
    mergeWeights(config.weights),
  );
}

export function slugifyName(filters: Filters): string {
  const parts: string[] = [];
  if (filters.weights === "open") parts.push("Open");
  if (filters.weights === "closed") parts.push("Proprietary");
  if (filters.input.values.length) {
    const label = filters.input.values.join("+");
    parts.push(filters.input.values.length === 1 && label === "text" ? "Text" : `${label}`);
  }
  if (filters.price.freeOnly) parts.push("Free");
  else if (filters.price.max < 5000)
    parts.push(`≤ $${filters.price.max < 1 ? filters.price.max.toFixed(2) : Math.round(filters.price.max)}`);
  if (filters.minContext > 0) parts.push(`${Math.round(filters.minContext / 1000)}K+`);
  if (filters.cache.require) parts.push("cached");
  return parts.join(" · ") || "Filtered selection";
}
