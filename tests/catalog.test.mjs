import { describe, expect, it } from "vitest";

import { buildCatalog, buildModel, matchAa } from "../shared/catalog.mjs";
import { normalizeLegacyRow, normalizeNewRow } from "../shared/aa.mjs";
import {
  blendPrice,
  cacheDiscount,
  classifyOpenness,
  modelKey,
  normalizeCreator,
  toPercent,
  toPricePerMillion,
  versionTokens,
  similarity,
} from "../shared/normalize.mjs";

/* ---------------------------------------------------------------- helpers */

function orModel(overrides = {}) {
  return {
    id: "anthropic/claude-opus-5.5",
    canonical_slug: "anthropic/claude-opus-5.5-20260921",
    hugging_face_id: null,
    name: "Anthropic: Claude Opus 5.5",
    created: 1_760_000_000,
    description: "A proprietary frontier model.",
    context_length: 1_000_000,
    architecture: {
      modality: "text+image+file->text",
      input_modalities: ["text", "image", "file"],
      output_modalities: ["text"],
    },
    pricing: {
      prompt: "0.000004",
      completion: "0.00002",
      input_cache_read: "0.0000002",
      input_cache_write: "0.000005",
    },
    top_provider: { max_completion_tokens: 128_000 },
    supported_parameters: ["tools", "reasoning", "response_format"],
    reasoning: { mandatory: false },
    benchmarks: { artificial_analysis: { intelligence_index: 57.6 } },
    ...overrides,
  };
}

function aaRow(overrides = {}) {
  return {
    slug: "claude-opus-5-5",
    name: "Claude Opus 5.5 (Max)",
    creator: "anthropic",
    creatorName: "Anthropic",
    releaseDate: "2026-09-22",
    scores: { intelligence: 57.6, coding: 55.1, finance: 60 },
    provenance: { intelligence: "artificial_analysis_intelligence_index" },
    pricing: { input: 4, output: 20, cacheHit: 0.2, cacheWrite: null },
    speed: {
      outputTokensPerSecond: 96.9,
      ttftSeconds: 0.56,
      ttfaSeconds: 0.56,
      endToEndSeconds: 9,
    },
    ...overrides,
  };
}

/* ------------------------------------------------------------- normalize */

describe("normalisation", () => {
  it("strips packaging suffixes and dates to a comparable key", () => {
    expect(modelKey("gpt-6-sol-high")).toBe("gpt-6-sol");
    expect(modelKey("claude-opus-5.5-20260921")).toBe("claude-opus-5-5");
    expect(modelKey("glm-5.3-flashx")).toBe("glm-5-3-flashx");
    expect(modelKey("~deepseek/deepseek-flash-latest".split("/")[1])).toBe("deepseek-flash");
  });

  it("maps creators across both catalogues", () => {
    expect(normalizeCreator("Z AI")).toBe("z-ai");
    expect(normalizeCreator("Alibaba")).toBe("qwen");
    expect(normalizeCreator("Moonshot AI")).toBe("moonshotai");
    expect(normalizeCreator("meta-llama")).toBe("meta");
    expect(normalizeCreator("xAI")).toBe("x-ai");
  });

  it("converts per-token prices to per-million and refuses negatives", () => {
    expect(toPricePerMillion("0.000004")).toBe(4);
    expect(toPricePerMillion("0")).toBe(0);
    expect(toPricePerMillion("-1")).toBeNull();
    expect(toPricePerMillion(undefined)).toBeNull();
  });

  it("normalises both 0-1 fractions and 0-100 indices", () => {
    expect(toPercent(0.614)).toBe(61.4);
    expect(toPercent(57.6)).toBe(57.6);
    expect(toPercent(null)).toBeNull();
  });

  it("computes the 3:1 blend and the cache discount", () => {
    expect(blendPrice(4, 20)).toBe(8);
    expect(blendPrice(1, 3)).toBe(1.5);
    expect(cacheDiscount(4, 0.2)).toBe(95);
    expect(cacheDiscount(null, 1)).toBeNull();
  });

  it("classifies openness from the strongest available signal", () => {
    expect(classifyOpenness({ author: "acme", huggingFaceId: "a/b", description: "" })).toEqual({
      openness: "open",
      reason: "huggingface",
    });
    expect(
      classifyOpenness({ author: "acme", huggingFaceId: null, description: "released open-weight checkpoints" }),
    ).toEqual({ openness: "open", reason: "description" });
    expect(classifyOpenness({ author: "openai", huggingFaceId: null, description: "" })).toEqual({
      openness: "closed",
      reason: "lab",
    });
    expect(classifyOpenness({ author: "mystery-lab", huggingFaceId: null, description: "" })).toEqual({
      openness: "unknown",
      reason: "none",
    });
  });

  it("measures slug similarity deterministically", () => {
    expect(similarity("gpt-6-sol", "gpt-6-sol")).toBe(1);
    expect(similarity("gpt-6-sol", "gpt-5-6-sol")).toBeLessThan(1);
    expect(versionTokens("hermes-3-llama-3-1-405b")).toEqual(["3", "3", "1"]);
  });
});

/* ---------------------------------------------------------------- joining */

describe("Artificial Analysis join", () => {
  const index = (() => {
    const byKey = new Map();
    const byCreator = new Map();
    for (const row of [aaRow(), aaRow({ slug: "claude-opus-5-5-high", scores: { intelligence: 50 } })]) {
      const key = modelKey(row.slug);
      const bucket = `${row.creator}/${key}`;
      const entry = { row, creator: row.creator, key };
      byKey.set(bucket, [...(byKey.get(bucket) ?? []), entry]);
      byCreator.set(row.creator, [...(byCreator.get(row.creator) ?? []), entry]);
    }
    return { byKey, byCreator };
  })();

  it("matches on an exact slug and prefers the row confirmed by the embedded index", () => {
    const match = matchAa(orModel(), index);
    expect(match.confidence).toBe("high");
    expect(match.matchedBy).toBe("exact+index");
    expect(match.row.scores.intelligence).toBe(57.6);
  });

  it("returns no match for an unknown creator", () => {
    const match = matchAa(orModel({ id: "example/unknown-model" }), index);
    expect(match.row).toBeNull();
  });

  it("never matches an image generator onto a text benchmark row", () => {
    const match = matchAa(
      orModel({
        id: "google/gemini-image-x",
        architecture: { input_modalities: ["text"], output_modalities: ["image"] },
      }),
      index,
    );
    expect(match.row).toBeNull();
  });
});

/* ----------------------------------------------------------- build model */

describe("catalogue building", () => {
  it("computes prices, features and openness for one model", () => {
    const model = buildModel(orModel(), matchAa(orModel(), { byKey: new Map(), byCreator: new Map() }));
    expect(model.pricing.prompt).toBe(4);
    expect(model.pricing.cacheRead).toBe(0.2);
    expect(model.pricing.blended).toBe(8);
    expect(model.pricing.cacheDiscountPct).toBe(95);
    expect(model.features).toContain("tools");
    expect(model.features).toContain("prompt_cache");
    expect(model.openness).toBe("closed");
    expect(model.benchmarks.intelligence).toBe(57.6);
    expect(model.benchmarkSources.intelligence).toBe("openrouter");
    expect(model.contextLength).toBe(1_000_000);
    expect(model.variant).toBe("standard");
  });

  it("flags free and alias variants", () => {
    expect(buildModel(orModel({ id: "x/y:free" }), { row: null }).variant).toBe("free");
    expect(buildModel(orModel({ id: "~x/y-latest" }), { row: null }).variant).toBe("alias");
    expect(buildModel(orModel({ pricing: { prompt: "-1", completion: "-1" } }), { row: null }).variant).toBe(
      "router",
    );
  });

  it("builds a bounded catalogue with stats and coverage", () => {
    const catalog = buildCatalog({
      orModels: [orModel(), orModel({ id: "example/open-weights", hugging_face_id: "e/o" })],
    });
    expect(catalog.stats.models).toBe(2);
    expect(catalog.stats.open).toBe(1);
    expect(catalog.stats.withBenchmarks).toBe(2);
    expect(catalog.bounds.context[0]).toBe(1_000_000);
    expect(catalog.benchmarks.find((benchmark) => benchmark.key === "intelligence").coverage).toBe(2);
    expect(catalog.feed).toBeNull();
  });
});

/* --------------------------------------------------------------- AA feed */

describe("Artificial Analysis adapters", () => {
  it("normalises the post-migration free tier shape", () => {
    const row = normalizeNewRow({
      name: "GLM-4.5V (Non-reasoning)",
      slug: "glm-4-5v",
      release_date: "2025-08-11",
      model_creator: { name: "Z AI" },
      evaluations: {
        artificial_analysis_intelligence_index: 6.7,
        artificial_analysis_coding_index: null,
        artificial_analysis_agentic_index: 12.5,
        artificial_analysis_engineering_index: 20,
      },
      pricing: {
        price_1m_input_tokens: 0.6,
        price_1m_output_tokens: 1.8,
        price_1m_cache_hit_tokens: 0.11,
        price_1m_cache_write_tokens: null,
      },
      performance: {
        median_output_tokens_per_second: 54.56,
        median_time_to_first_token_seconds: 3.36,
      },
    });
    expect(row.creator).toBe("z-ai");
    expect(row.scores.intelligence).toBe(6.7);
    expect(row.scores.agentic).toBe(12.5);
    expect(row.scores.coding).toBeUndefined();
    expect(row.pricing.cacheHit).toBe(0.11);
    expect(row.speed.outputTokensPerSecond).toBe(54.56);
  });

  it("normalises the legacy shape and rescales fractions", () => {
    const row = normalizeLegacyRow({
      name: "Claude Opus 5.5 (Max)",
      slug: "claude-opus-5-5",
      release_date: "2026-09-22",
      model_creator: { name: "Anthropic", slug: "anthropic" },
      evaluations: {
        artificial_analysis_intelligence_index: 57.6,
        gpqa: 0.9,
        hle: 0.614,
        terminalbench_v4_0: 0.5959,
      },
      pricing: { price_1m_input_tokens: 4, price_1m_output_tokens: 20 },
      median_output_tokens_per_second: 96.9,
      median_time_to_first_token_seconds: 567,
    });
    expect(row.scores.gpqa).toBe(90);
    expect(row.scores.hle).toBe(61.4);
    expect(row.scores.terminalbench).toBe(59.6);
    expect(row.creator).toBe("anthropic");
    expect(row.speed.ttfaSeconds).toBeNull();
  });
});
