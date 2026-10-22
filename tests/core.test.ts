import { describe, expect, it } from "vitest";

import {
  DEFAULT_FILTERS,
  activeChips,
  applyFilters,
  diagnose,
  facetCounts,
  matches,
  sortModels,
  type Filters,
} from "@/lib/filter";
import { importConfig, mergeFilters, makePreset } from "@/lib/presets";
import { computeFitScores, paretoFrontier, recommend } from "@/lib/scoring";
import { decodeState, encodeState } from "@/lib/url";
import type { BenchmarkScores, LlmModel } from "@/lib/types";

const emptyScores: BenchmarkScores = {
  intelligence: null,
  coding: null,
  math: null,
  agentic: null,
  terminalbench: null,
  livecodebench: null,
  scicode: null,
  gpqa: null,
  mmluPro: null,
  hle: null,
  aime: null,
  math500: null,
  ifbench: null,
  lcr: null,
  tau2: null,
  tauBanking: null,
  finance: null,
  strategy: null,
  legal: null,
  healthcare: null,
  engineering: null,
  economics: null,
};

function makeModel(overrides: Partial<LlmModel> = {}): LlmModel {
  return {
    id: "test/model",
    cleanId: "test/model",
    slug: "model",
    name: "Test: Model",
    author: "test",
    authorLabel: "Test",
    creator: "test",
    variant: "standard",
    aliasTarget: null,
    created: new Date().toISOString(),
    contextLength: 128_000,
    maxOutputTokens: 4096,
    pricing: {
      prompt: 1,
      completion: 4,
      cacheRead: 0.1,
      cacheWrite: null,
      cacheWrite1h: null,
      image: null,
      audio: null,
      webSearch: null,
      blended: 1.75,
      cacheDiscountPct: 90,
    },
    modalities: { input: ["text"], output: ["text"] },
    openness: "open",
    opennessReason: "huggingface",
    huggingFaceId: "org/model",
    knowledgeCutoff: null,
    deprecated: false,
    reasoning: null,
    supportedParameters: ["tools"],
    features: ["tools", "prompt_cache"],
    benchmarks: { ...emptyScores, intelligence: 50 },
    benchmarkSources: {},
    aa: null,
    speed: { outputTokensPerSecond: 100, ttftSeconds: 0.4 },
    ...overrides,
  };
}

const models: LlmModel[] = [
  makeModel({
    id: "open/cheap",
    creator: "open",
    authorLabel: "Open",
    pricing: { ...makeModel().pricing, prompt: 0.1, completion: 0.4, blended: 0.175, cacheRead: 0.01 },
    benchmarks: { ...emptyScores, intelligence: 30, coding: 25 },
    modalities: { input: ["text", "image"], output: ["text"] },
  }),
  makeModel({
    id: "closed/mid",
    creator: "closed",
    authorLabel: "Closed",
    openness: "closed",
    opennessReason: "lab",
    huggingFaceId: null,
    pricing: { ...makeModel().pricing, prompt: 3, completion: 15, blended: 6, cacheRead: null, cacheDiscountPct: null },
    benchmarks: { ...emptyScores, intelligence: 60, coding: 65, agentic: 55 },
    features: ["tools", "reasoning"],
    contextLength: 1_000_000,
    speed: { outputTokensPerSecond: 60, ttftSeconds: 1.2 },
  }),
  makeModel({
    id: "open/expensive",
    creator: "open",
    authorLabel: "Open",
    pricing: { ...makeModel().pricing, prompt: 10, completion: 40, blended: 17.5, cacheRead: 2 },
    benchmarks: { ...emptyScores, intelligence: 80, coding: 75 },
    contextLength: 200_000,
    speed: { outputTokensPerSecond: 30, ttftSeconds: 2 },
  }),
  makeModel({
    id: "free/model",
    creator: "free",
    variant: "free",
    pricing: { ...makeModel().pricing, prompt: 0, completion: 0, blended: 0, cacheRead: null, cacheDiscountPct: null },
    benchmarks: { ...emptyScores },
    modalities: { input: ["text", "audio"], output: ["text"] },
  }),
];

const filters = (patch: Partial<Filters> = {}): Filters => ({ ...DEFAULT_FILTERS, ...patch });

describe("filter engine", () => {
  it("returns everything by default except hidden variants", () => {
    expect(applyFilters(models, filters())).toHaveLength(4);
  });

  it("ANDs within a multi-select facet when mode is all", () => {
    const result = applyFilters(models, filters({ input: { mode: "all", values: ["text", "image"] } }));
    expect(result.map((model) => model.id)).toEqual(["open/cheap"]);
  });

  it("ORs within a facet when mode is any", () => {
    const result = applyFilters(models, filters({ input: { mode: "any", values: ["image", "audio"] } }));
    expect(result).toHaveLength(2);
  });

  it("filters by weights tri-state", () => {
    expect(applyFilters(models, filters({ weights: "open" }))).toHaveLength(3);
    expect(applyFilters(models, filters({ weights: "closed" }))).toHaveLength(1);
  });

  it("filters by Design Arena Elo and ignores models without arena data", () => {
    const arena = makeModel({
      id: "arena/model",
      designArena: {
        bestElo: 1476,
        avgElo: 1400,
        avgWinRate: 65,
        bestRank: 1,
        samples: 3,
        categories: [],
      },
    });
    const withArena = [...models, arena];
    expect(applyFilters(withArena, filters({ minArenaElo: 1300 })).map((m) => m.id)).toEqual([
      "arena/model",
    ]);
    expect(applyFilters(withArena, filters({ minArenaElo: 0 }))).toHaveLength(5);
  });

  it("never treats a missing price as $0", () => {
    const unpriced = makeModel({ id: "no/price", pricing: { ...makeModel().pricing, blended: null, prompt: null, completion: null } });
    expect(matches(unpriced, filters({ price: { ...DEFAULT_FILTERS.price, max: 1, includeUnpriced: false } }))).toBe(false);
    expect(matches(unpriced, filters({ price: { ...DEFAULT_FILTERS.price, max: 1, includeUnpriced: true } }))).toBe(true);
  });

  it("requires cache pricing when asked and honours the discount floor", () => {
    const byCache = applyFilters(models, filters({ cache: { require: true, max: 5, minDiscount: 0 } }));
    expect(byCache.map((model) => model.id)).not.toContain("closed/mid");
    const byDiscount = applyFilters(models, filters({ cache: { require: true, max: 5, minDiscount: 95 } }));
    expect(byDiscount).toHaveLength(0);
  });

  it("applies the strictest benchmark floor", () => {
    const result = applyFilters(models, filters({ mins: { intelligence: 55, coding: 60 } }));
    expect(result.map((model) => model.id)).toEqual(["closed/mid", "open/expensive"]);
    expect(applyFilters(models, filters({ mins: { intelligence: 95 } }))).toHaveLength(0);
  });

  it("hides batch variants by default but keeps them when asked", () => {
    const batch = makeModel({ id: "batch/model", variant: "batch" });
    expect(matches(batch, filters())).toBe(false);
    expect(matches(batch, filters({ hideBatch: false }))).toBe(true);
  });

  it("computes self-excluding facet counts", () => {
    const counts = facetCounts(models, filters({ input: { mode: "all", values: ["image"] } }));
    // the facet excludes itself: the count reflects every other filter, so it still shows
    // how many models would match if image were the only modality constraint
    expect(counts.input.image).toBe(1);
    expect(counts.input.text).toBe(4);
  });

  it("sinks missing values instead of sorting them as zero", () => {
    const sorted = sortModels(models, { key: "intelligence", dir: -1 });
    expect(sorted.at(-1)?.id).toBe("free/model");
    expect(sorted[0].id).toBe("open/expensive");
  });

  it("builds removable chips and a diagnosis ranked by recovered models", () => {
    const strict = filters({ mins: { intelligence: 90 }, weights: "closed" });
    expect(applyFilters(models, strict)).toHaveLength(0);
    const chips = activeChips(strict);
    expect(chips.map((chip) => chip.id)).toContain("weights");
    const diagnosis = diagnose(models, strict);
    expect(diagnosis[0].removed).toBeGreaterThan(0);
  });
});

describe("scoring", () => {
  it("ranks within the filtered set and respects weights", () => {
    const cheapFirst = computeFitScores(models, { quality: 0, price: 100, speed: 0, context: 0, cache: 0 });
    const best = [...cheapFirst.entries()].sort((a, b) => b[1].score - a[1].score)[0];
    expect(best[0]).toBe("free/model");

    const qualityFirst = computeFitScores(models, { quality: 100, price: 0, speed: 0, context: 0, cache: 0 });
    const top = [...qualityFirst.entries()].sort((a, b) => b[1].score - a[1].score)[0];
    expect(top[0]).toBe("open/expensive");
  });

  it("finds the pareto frontier", () => {
    const frontier = paretoFrontier(models);
    expect(frontier.has("open/cheap")).toBe(true);
    expect(frontier.has("open/expensive")).toBe(true);
    // middle of the curve is still efficient: cheaper than the best, better than the cheapest
    expect(frontier.has("closed/mid")).toBe(true);
    // a model that is worse and pricier than another point must never be on the frontier
    const dominated = makeModel({
      id: "closed/dominated",
      pricing: { ...makeModel().pricing, blended: 20 },
      benchmarks: { ...emptyScores, intelligence: 10 },
    });
    expect(paretoFrontier([...models, dominated]).has("closed/dominated")).toBe(false);
  });

  it("produces recommendations that exist in the set", () => {
    const scores = computeFitScores(models, {
      quality: 45,
      price: 25,
      speed: 12,
      context: 8,
      cache: 10,
    });
    const picks = recommend(models, scores);
    expect(picks.length).toBeGreaterThan(0);
    for (const pick of picks) {
      expect(models.some((model) => model.id === pick.model.id)).toBe(true);
    }
  });
});

describe("presets and config", () => {
  const preset = makePreset("Cheap", filters({ q: "flash" }), { key: "price", dir: 1 }, {
    quality: 20,
    price: 60,
    speed: 10,
    context: 5,
    cache: 5,
  });

  it("round-trips a config through encode/decode without losing filters", () => {
    const config = {
      filters: filters({ weights: "open", minContext: 128_000, mins: { intelligence: 40 } }),
      sort: { key: "value" as const, dir: -1 as const },
      weights: { quality: 30, price: 30, speed: 20, context: 10, cache: 10 },
      view: "compare",
      selected: ["open/cheap", "closed/mid"],
    };
    const query = encodeState(config);
    const decoded = decodeState(query);
    expect(decoded.filters?.weights).toBe("open");
    expect(decoded.filters?.minContext).toBe(128_000);
    expect(decoded.filters?.mins.intelligence).toBe(40);
    expect(decoded.sort).toEqual({ key: "value", dir: -1 });
    expect(decoded.view).toBe("compare");
    expect(decoded.selected).toEqual(["open/cheap", "closed/mid"]);
  });

  it("keeps both presets when an import collides with a local name", () => {
    const incoming = {
      app: "som-llm-selector",
      version: 1,
      presets: [{ id: preset.id, name: preset.name, filters: { q: "other" } }],
    };
    const result = importConfig(incoming, [preset]);
    expect(result.groups.new).toHaveLength(1);
    expect(result.groups.new[0].name).toBe("Cheap (imported)");
  });

  it("detects unchanged presets instead of duplicating them", () => {
    const incoming = {
      version: 1,
      presets: [
        {
          id: preset.id,
          name: preset.name,
          filters: preset.filters,
          sort: preset.sort,
          weights: preset.weights,
        },
      ],
    };
    const result = importConfig(incoming, [preset]);
    expect(result.groups.unchanged).toHaveLength(1);
    expect(result.groups.new).toHaveLength(0);
  });

  it("rejects garbage without throwing", () => {
    const result = importConfig({ nope: true }, []);
    expect(result.skipped.length).toBeGreaterThan(0);
    expect(mergeFilters("nonsense").hideDeprecated).toBe(true);
  });
});
