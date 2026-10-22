/**
 * Catalogue builder: turns the OpenRouter model list (plus an optional Artificial
 * Analysis feed) into the single JSON document the app consumes.
 *
 * Design rules
 *  - OpenRouter is the universe of *callable* models.
 *  - Artificial Analysis is the evaluation authority; OpenRouter's embedded AA indices are
 *    only used as a cross-check for the join, never as the primary value.
 *  - Nothing is invented: missing numbers stay `null` and carry provenance.
 *  - AA rows are never persisted to disk by the app; the caller supplies them per request.
 */

import { BENCHMARKS } from "./benchmarks.mjs";
import {
  AUTHOR_LABELS,
  blendPrice,
  cacheDiscount,
  classifyOpenness,
  modelKey,
  normalizeCreator,
  similarity,
  toPercent,
  toPricePerMillion,
  versionCompatible,
  versionTokens,
} from "./normalize.mjs";

export const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
export const CATALOG_VERSION = 1;

async function getJson(url, { headers = {}, fetchImpl = fetch } = {}) {
  const res = await fetchImpl(url, {
    headers: { accept: "application/json", ...headers },
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${url} -> HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function fetchOpenRouter({ apiKey, fetchImpl, referer } = {}) {
  const headers = {
    // OpenRouter asks apps to identify themselves on every call.
    "HTTP-Referer": referer ?? "https://github.com/frederico-kluser/som-llm-selector",
    "X-OpenRouter-Title": "SOM - LLM Selector",
    ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
  };
  const json = await getJson(OPENROUTER_MODELS_URL, { headers, fetchImpl });
  return Array.isArray(json?.data) ? json.data : [];
}

function detectVariant(rawId, pricing) {
  const id = String(rawId ?? "");
  if (id.includes(":free")) return "free";
  if (id.includes(":batch")) return "batch";
  if (id.startsWith("~")) return "alias";
  if (pricing?.prompt === "-1" || pricing?.completion === "-1") return "router";
  return "standard";
}

function plainId(rawId) {
  return String(rawId ?? "")
    .replace(/^~/, "")
    .split(":")[0];
}

function buildAaIndex(rows) {
  const byKey = new Map();
  const byCreator = new Map();
  for (const row of rows) {
    const creator = row.creator || normalizeCreator(row.creatorName ?? "");
    const key = modelKey(row.slug ?? "");
    const entry = { row, creator, key };
    const bucket = `${creator}/${key}`;
    const list = byKey.get(bucket);
    if (list) list.push(entry);
    else byKey.set(bucket, [entry]);
    const pool = byCreator.get(creator);
    if (pool) pool.push(entry);
    else byCreator.set(creator, [entry]);
  }
  return { byKey, byCreator };
}

function bestVariant(candidates) {
  return candidates.reduce((best, current) => {
    const a = current.row.scores.intelligence;
    const b = best.row.scores.intelligence;
    if (a === undefined) return best;
    if (b === undefined) return current;
    return a > b ? current : best;
  }, candidates[0]);
}

/**
 * Match one OpenRouter model to the closest Artificial Analysis row.
 * @returns {{row: object|null, matchedBy: string, confidence: 'high'|'medium'|'low'|null}}
 */
export function matchAa(orModel, index) {
  const rawId = String(orModel?.id ?? "");
  const author = plainId(rawId).split("/")[0] ?? "";
  const slug = plainId(rawId).split("/").slice(1).join("/");
  const creator = normalizeCreator(author);
  const key = modelKey(slug);
  const embedded = orModel?.benchmarks?.artificial_analysis ?? {};
  const embeddedIndex =
    typeof embedded.intelligence_index === "number" ? embedded.intelligence_index : null;
  const outputs = orModel?.architecture?.output_modalities ?? ["text"];
  const textOnlyOutput = outputs.length === 1 && outputs[0] === "text";

  const direct = index.byKey.get(`${creator}/${key}`);
  if (direct?.length) {
    if (embeddedIndex !== null) {
      const confirmed = direct.find((c) => {
        const v = c.row.scores.intelligence;
        return typeof v === "number" && Math.abs(v - embeddedIndex) < 0.05;
      });
      if (confirmed) return { row: confirmed.row, matchedBy: "exact+index", confidence: "high" };
    }
    return { row: bestVariant(direct).row, matchedBy: "slug", confidence: "high" };
  }

  const pool = index.byCreator.get(creator) ?? [];
  if (!pool.length) return { row: null, matchedBy: "none", confidence: null };

  const scored = pool
    .map((entry) => ({ entry, score: similarity(key, entry.key) }))
    .sort((a, b) => b.score - a.score);

  if (embeddedIndex !== null) {
    const anchored = scored.find(
      ({ entry, score }) =>
        score >= 0.72 &&
        versionCompatible(versionTokens(key), versionTokens(entry.key)) &&
        typeof entry.row.scores.intelligence === "number" &&
        Math.abs(entry.row.scores.intelligence - embeddedIndex) < 0.05,
    );
    if (anchored) {
      return { row: anchored.entry.row, matchedBy: "fuzzy+index", confidence: "medium" };
    }
  }

  // Image/audio generators have no meaningful text benchmark; never guess for them.
  if (!textOnlyOutput) return { row: null, matchedBy: "none", confidence: null };

  const best = scored[0];
  if (
    best &&
    best.score >= 0.86 &&
    versionCompatible(versionTokens(key), versionTokens(best.entry.key))
  ) {
    return { row: best.entry.row, matchedBy: "fuzzy", confidence: "low" };
  }
  return { row: null, matchedBy: "none", confidence: null };
}

function buildFeatures(orModel, pricing) {
  const params = new Set(orModel?.supported_parameters ?? []);
  const outputs = new Set(orModel?.architecture?.output_modalities ?? []);
  const features = [];
  if (params.has("tools")) features.push("tools");
  if (params.has("structured_outputs") || params.has("response_format")) features.push("structured");
  if (params.has("reasoning") || orModel?.reasoning) features.push("reasoning");
  if (pricing?.webSearch !== null) features.push("web_search");
  if (pricing?.cacheRead !== null) features.push("prompt_cache");
  if (outputs.has("image")) features.push("image_output");
  if (outputs.has("audio")) features.push("audio_output");
  if ((orModel?.context_length ?? 0) >= 200_000) features.push("long_context");
  if (params.has("logprobs")) features.push("logprobs");
  return features;
}

function toIso(unixSeconds) {
  if (!unixSeconds || !Number.isFinite(Number(unixSeconds))) return null;
  return new Date(Number(unixSeconds) * 1000).toISOString();
}

export function buildModel(orModel, aaMatch, feedMeta = {}) {
  const rawId = String(orModel?.id ?? "");
  const cleanId = plainId(rawId);
  const [author, ...rest] = cleanId.split("/");
  const slug = rest.join("/");
  const pricingRaw = orModel?.pricing ?? {};
  const inputModalities = orModel?.architecture?.input_modalities ?? ["text"];
  const outputModalities = orModel?.architecture?.output_modalities ?? ["text"];
  const pricing = {
    prompt: toPricePerMillion(pricingRaw.prompt),
    completion: toPricePerMillion(pricingRaw.completion),
    cacheRead: toPricePerMillion(pricingRaw.input_cache_read),
    cacheWrite: toPricePerMillion(pricingRaw.input_cache_write),
    cacheWrite1h: toPricePerMillion(pricingRaw.input_cache_write_1h),
    image: toPricePerMillion(pricingRaw.image),
    audio: toPricePerMillion(pricingRaw.audio ?? pricingRaw.input_audio_cache),
    webSearch: toPricePerMillion(pricingRaw.web_search),
  };
  pricing.blended = blendPrice(pricing.prompt, pricing.completion);
  pricing.cacheDiscountPct = cacheDiscount(pricing.prompt, pricing.cacheRead);

  const { openness, reason } = classifyOpenness({
    author,
    huggingFaceId: orModel?.hugging_face_id ?? null,
    description: orModel?.description ?? "",
  });

  const row = aaMatch?.row ?? null;
  const embedded = orModel?.benchmarks?.artificial_analysis ?? {};
  const benchmarks = {};
  const benchmarkSources = {};
  for (const { key } of BENCHMARKS) {
    const fromAa = row?.scores?.[key] ?? null;
    let fromOr = null;
    if (key === "intelligence" && typeof embedded.intelligence_index === "number")
      fromOr = toPercent(embedded.intelligence_index);
    if (key === "coding" && typeof embedded.coding_index === "number")
      fromOr = toPercent(embedded.coding_index);
    if (key === "agentic" && typeof embedded.agentic_index === "number")
      fromOr = toPercent(embedded.agentic_index);
    benchmarks[key] = fromAa ?? fromOr;
    benchmarkSources[key] =
      fromAa !== null ? "artificial-analysis" : fromOr !== null ? "openrouter" : null;
  }

  const expiration = orModel?.expiration_date ? Date.parse(orModel.expiration_date) : null;
  const deprecated = expiration !== null && Number.isFinite(expiration) && expiration < Date.now();

  return {
    id: rawId,
    cleanId,
    slug,
    name: orModel?.name ?? cleanId,
    author,
    authorLabel: AUTHOR_LABELS[normalizeCreator(author)] ?? author,
    creator: normalizeCreator(author),
    variant: detectVariant(rawId, orModel?.pricing),
    aliasTarget: orModel?.alias_target ?? null,
    created: toIso(orModel?.created),
    contextLength: Number(orModel?.context_length ?? 0),
    maxOutputTokens: orModel?.top_provider?.max_completion_tokens ?? null,
    pricing,
    modalities: { input: [...inputModalities], output: [...outputModalities] },
    openness,
    opennessReason: reason,
    huggingFaceId: orModel?.hugging_face_id ?? null,
    knowledgeCutoff: orModel?.knowledge_cutoff ?? null,
    deprecated,
    reasoning: orModel?.reasoning ?? null,
    supportedParameters: orModel?.supported_parameters ?? [],
    features: buildFeatures(orModel, pricing),
    benchmarks,
    benchmarkSources,
    aa: row
      ? {
          slug: row.slug,
          name: row.name,
          creator: row.creator,
          releaseDate: row.releaseDate ?? null,
          matchedBy: aaMatch.matchedBy,
          confidence: aaMatch.confidence,
          provenance: row.provenance ?? {},
          tier: feedMeta.tier ?? null,
          pricing: row.pricing ?? null,
          speed: row.speed ?? null,
        }
      : null,
    speed: {
      outputTokensPerSecond: row?.speed?.outputTokensPerSecond ?? null,
      ttftSeconds: row?.speed?.ttftSeconds ?? null,
    },
  };
}

export function buildCatalog({ orModels, aaFeed = null, orMeta = {} }) {
  const generatedAt = new Date().toISOString();
  const rows = aaFeed?.rows ?? [];
  const aaIndex = buildAaIndex(rows);
  const feedMeta = { tier: aaFeed?.tier ?? null };
  const models = orModels.map((orModel) =>
    buildModel(orModel, matchAa(orModel, aaIndex), feedMeta),
  );

  const creatorsMap = new Map();
  for (const model of models) {
    const entry = creatorsMap.get(model.creator) ?? {
      id: model.creator,
      label: model.authorLabel,
      count: 0,
      open: 0,
      bestIntelligence: null,
    };
    entry.count += 1;
    if (model.openness === "open") entry.open += 1;
    const intel = model.benchmarks.intelligence;
    if (intel !== null && (entry.bestIntelligence === null || intel > entry.bestIntelligence)) {
      entry.bestIntelligence = intel;
    }
    creatorsMap.set(model.creator, entry);
  }
  const creators = [...creatorsMap.values()].sort((a, b) => b.count - a.count);

  const benchmarks = BENCHMARKS.map((b) => ({
    ...b,
    coverage: models.filter((m) => m.benchmarks[b.key] !== null).length,
  }));

  const promptPrices = models.map((m) => m.pricing.prompt).filter((v) => v !== null && v > 0);
  const cachePrices = models.map((m) => m.pricing.cacheRead).filter((v) => v !== null && v > 0);
  const contexts = models.map((m) => m.contextLength).filter((v) => v > 0);
  const createdDates = models.map((m) => m.created).filter(Boolean).sort();

  const modalityCounts = {};
  for (const model of models) {
    for (const mod of model.modalities.input) {
      modalityCounts[mod] = (modalityCounts[mod] ?? 0) + 1;
    }
  }

  return {
    version: CATALOG_VERSION,
    generatedAt,
    benchmarks,
    models,
    creators,
    feed: aaFeed
      ? {
          tier: aaFeed.tier,
          intelligenceIndexVersion: aaFeed.intelligenceIndexVersion ?? null,
          fetchedAt: aaFeed.fetchedAt,
          rows: rows.length,
        }
      : null,
    sources: [
      {
        id: "openrouter",
        label: "OpenRouter",
        url: "https://openrouter.ai/api/v1/models",
        count: orModels.length,
        fetchedAt: orMeta.openRouterFetchedAt ?? generatedAt,
        license: "OpenRouter API — attribution required",
      },
      {
        id: "artificial-analysis",
        label: "Artificial Analysis",
        url: "https://artificialanalysis.ai",
        count: rows.length,
        fetchedAt: aaFeed?.fetchedAt ?? null,
        license: "Artificial Analysis Data Platform Terms — per-user key, not redistributed",
      },
    ],
    bounds: {
      prompt: [Math.min(...promptPrices), Math.max(...promptPrices)],
      cacheRead: cachePrices.length ? [Math.min(...cachePrices), Math.max(...cachePrices)] : [0, 0],
      context: [Math.min(...contexts), Math.max(...contexts)],
      created: [createdDates[0] ?? null, createdDates.at(-1) ?? null],
    },
    stats: {
      models: models.length,
      withBenchmarks: models.filter((m) => Object.values(m.benchmarks).some((v) => v !== null))
        .length,
      open: models.filter((m) => m.openness === "open").length,
      closed: models.filter((m) => m.openness === "closed").length,
      unknown: models.filter((m) => m.openness === "unknown").length,
      free: models.filter((m) => m.pricing.prompt === 0 && m.pricing.completion === 0).length,
      withCache: models.filter((m) => m.pricing.cacheRead !== null).length,
      deprecated: models.filter((m) => m.deprecated).length,
      byModality: modalityCounts,
      aaMatched: models.filter((m) => m.aa !== null).length,
    },
  };
}
