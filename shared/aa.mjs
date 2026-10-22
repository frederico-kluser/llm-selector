/**
 * Artificial Analysis feed client.
 *
 * The legacy endpoint `/api/v2/data/llms/models` is retired on 2026-11-04, so the new
 * `language/models/free` tier is the primary source with the legacy feed as a fallback.
 * Both shapes are normalized into one row type.
 *
 * Licensing note: AA data is never written to disk or shipped in the repository.
 * It is fetched per user key, kept in a short-lived in-memory cache, and attributed in
 * the UI. See NOTICE.md.
 */

import { normalizeCreator, normalizeSlug, toPercent } from "./normalize.mjs";

const AA_BASE = "https://artificialanalysis.ai/api/v2";
const NEW_ENDPOINT = `${AA_BASE}/language/models/free`;
const LEGACY_ENDPOINT = `${AA_BASE}/data/llms/models`;
const PAGE_SIZE = 200;
const MAX_PAGES = 12;

/** field list per tier: first non-null wins, mirroring AA's own naming churn. */
const NEW_FIELDS = {
  intelligence: ["artificial_analysis_intelligence_index"],
  coding: ["artificial_analysis_coding_index"],
  agentic: ["artificial_analysis_agentic_index"],
  finance: ["artificial_analysis_finance_and_accounting_index"],
  strategy: ["artificial_analysis_strategy_and_ops_index"],
  legal: ["artificial_analysis_legal_index"],
  healthcare: ["artificial_analysis_healthcare_and_medical_index"],
  engineering: ["artificial_analysis_engineering_index"],
  economics: ["artificial_analysis_economics_index"],
};

const LEGACY_FIELDS = {
  intelligence: ["artificial_analysis_intelligence_index"],
  coding: ["artificial_analysis_coding_index"],
  math: ["artificial_analysis_math_index"],
  gpqa: ["gpqa", "gpqa_diamond"],
  mmluPro: ["mmlu_pro"],
  hle: ["hle"],
  livecodebench: ["livecodebench"],
  scicode: ["scicode"],
  aime: ["aime_25", "aime"],
  math500: ["math_500"],
  ifbench: ["ifbench"],
  lcr: ["lcr", "aa_lcr"],
  tau2: ["tau2", "tau2_telecom"],
  tauBanking: ["tau_banking"],
  terminalbench: ["terminalbench_v4_0", "terminalbench_v2_1", "terminalbench_hard"],
};

function extractScores(evaluations, fieldMap) {
  const scores = {};
  const provenance = {};
  for (const [key, fields] of Object.entries(fieldMap)) {
    for (const field of fields) {
      const pct = toPercent(evaluations?.[field]);
      if (pct !== null) {
        scores[key] = pct;
        provenance[key] = field;
        break;
      }
    }
  }
  return { scores, provenance };
}

export function normalizeNewRow(row) {
  const { scores, provenance } = extractScores(row?.evaluations, NEW_FIELDS);
  const creatorName = row?.model_creator?.name ?? "";
  return {
    slug: row?.slug ?? "",
    name: row?.name ?? "",
    creator: normalizeCreator(row?.model_creator?.slug || creatorName),
    creatorName,
    releaseDate: row?.release_date ?? null,
    scores,
    provenance,
    pricing: {
      input: row?.pricing?.price_1m_input_tokens ?? null,
      output: row?.pricing?.price_1m_output_tokens ?? null,
      cacheHit: row?.pricing?.price_1m_cache_hit_tokens ?? null,
      cacheWrite: row?.pricing?.price_1m_cache_write_tokens ?? null,
    },
    speed: {
      outputTokensPerSecond: row?.performance?.median_output_tokens_per_second ?? null,
      ttftSeconds: row?.performance?.median_time_to_first_token_seconds ?? null,
      ttfaSeconds: row?.performance?.median_time_to_first_answer_token_seconds ?? null,
      endToEndSeconds: row?.performance?.median_end_to_end_response_time_seconds ?? null,
    },
  };
}

export function normalizeLegacyRow(row) {
  const { scores, provenance } = extractScores(row?.evaluations, LEGACY_FIELDS);
  const creatorName = row?.model_creator?.name ?? "";
  return {
    slug: row?.slug ?? "",
    name: row?.name ?? "",
    creator: normalizeCreator(row?.model_creator?.slug || creatorName),
    creatorName,
    releaseDate: row?.release_date ?? null,
    scores,
    provenance,
    pricing: {
      input: row?.pricing?.price_1m_input_tokens ?? null,
      output: row?.pricing?.price_1m_output_tokens ?? null,
      cacheHit: row?.pricing?.price_1m_cache_hit_tokens ?? null,
      cacheWrite: row?.pricing?.price_1m_cache_write_tokens ?? null,
    },
    speed: {
      outputTokensPerSecond: row?.median_output_tokens_per_second ?? null,
      ttftSeconds: row?.median_time_to_first_token_seconds ?? null,
      ttfaSeconds: row?.median_time_to_first_answer_token ?? null,
      endToEndSeconds: row?.median_end_to_end_response_time_seconds ?? null,
    },
  };
}

async function getJson(url, apiKey, fetchImpl) {
  const res = await fetchImpl(url, {
    headers: { accept: "application/json", "x-api-key": apiKey },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const error = new Error(`AA ${res.status}: ${body.slice(0, 200) || res.statusText}`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

async function fetchNewTier(apiKey, fetchImpl) {
  const rows = [];
  let page = 1;
  let intelligenceIndexVersion = null;
  let tier = "free";
  for (; page <= MAX_PAGES; page += 1) {
    const url = `${NEW_ENDPOINT}?page=${page}&page_size=${PAGE_SIZE}`;
    const json = await getJson(url, apiKey, fetchImpl);
    tier = json?.tier ?? tier;
    intelligenceIndexVersion = json?.intelligence_index_version ?? intelligenceIndexVersion;
    const data = Array.isArray(json?.data) ? json.data : [];
    rows.push(...data.map(normalizeNewRow));
    const more = Boolean(json?.pagination?.has_more);
    if (!more || data.length === 0) break;
  }
  return {
    tier,
    intelligenceIndexVersion,
    fetchedAt: new Date().toISOString(),
    rows,
    endpoint: NEW_ENDPOINT,
  };
}

async function fetchLegacy(apiKey, fetchImpl) {
  const json = await getJson(LEGACY_ENDPOINT, apiKey, fetchImpl);
  const data = Array.isArray(json?.data) ? json.data : [];
  return {
    tier: "legacy",
    intelligenceIndexVersion: null,
    fetchedAt: new Date().toISOString(),
    rows: data.map(normalizeLegacyRow),
    endpoint: LEGACY_ENDPOINT,
  };
}

/**
 * Fetch the Artificial Analysis feed, preferring the post-migration endpoint.
 * Throws an `Error` with `.status` when the key is rejected.
 */
export async function fetchAaFeed({ apiKey, fetchImpl = fetch, prefer = "new" } = {}) {
  if (!apiKey) {
    const error = new Error("Artificial Analysis API key missing");
    error.status = 401;
    throw error;
  }
  if (prefer === "legacy") return fetchLegacy(apiKey, fetchImpl);
  try {
    const feed = await fetchNewTier(apiKey, fetchImpl);
    if (feed.rows.length) return feed;
  } catch (error) {
    if (error?.status === 401 || error?.status === 403) throw error;
    // fall through to the legacy feed for anything else (404/410/timeout)
  }
  return fetchLegacy(apiKey, fetchImpl);
}

export { NEW_ENDPOINT, LEGACY_ENDPOINT, normalizeCreator, normalizeSlug };
