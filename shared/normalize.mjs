/**
 * Normalization + classification helpers shared by the build script and the API server.
 * Pure functions, no I/O — covered by unit tests in tests/normalize.test.mjs
 */

/** Author aliases across OpenRouter and Artificial Analysis. */
const CREATOR_ALIASES = {
  zai: "z-ai",
  "z-ai": "z-ai",
  zhipu: "z-ai",
  alibaba: "qwen",
  qwen: "qwen",
  kimi: "moonshotai",
  moonshot: "moonshotai",
  moonshotai: "moonshotai",
  bytedance_seed: "bytedance",
  "bytedance-seed": "bytedance",
  bytedance: "bytedance",
  "tii-uae": "tiiuae",
  tiiuae: "tiiuae",
  tii: "tiiuae",
  "thinking-machines": "thinkingmachines",
  thinkingmachines: "thinkingmachines",
  "ai21-labs": "ai21",
  ai21: "ai21",
  "reka-ai": "rekaai",
  rekaai: "rekaai",
  meta: "meta",
  "meta-llama": "meta",
  llama: "meta",
  aws: "amazon",
  amazon: "amazon",
  azure: "microsoft",
  microsoft: "microsoft",
  "nex-agi": "nex-agi",
  nex: "nex-agi",
  liquidai: "liquid",
  liquid: "liquid",
  "liquid-ai": "liquid",
  "swiss-ai-initiative": "swissai",
  "nous-research": "nousresearch",
  nousresearch: "nousresearch",
  nous: "nousresearch",
  xai: "x-ai",
  "x-ai": "x-ai",
  sakana: "sakana",
  "sakana-ai": "sakana",
  ai2: "allenai",
  allenai: "allenai",
  mistral: "mistralai",
  mistralai: "mistralai",
  "ibm-granite": "ibm",
  ibm: "ibm",
  "arcee-ai": "arcee",
  arcee: "arcee",
  "bytedance-seed": "bytedance",
  "dots-studio": "dots-studio",
  "xingchen-agi": "xingchen",
  "prism-ml": "prism-ml",
  "inference-net": "inference-net",
  "moonshot-ai": "moonshotai",
  "cognitivecomputations": "cognitivecomputations",
  "anthracite-org": "anthracite",
};

/** Author-level display names. */
export const AUTHOR_LABELS = {
  "z-ai": "Z.ai",
  qwen: "Qwen",
  moonshotai: "Moonshot AI",
  bytedance: "ByteDance Seed",
  tiiuae: "TII UAE",
  thinkingmachines: "Thinking Machines",
  rekaai: "Reka",
  meta: "Meta",
  amazon: "Amazon",
  microsoft: "Microsoft",
  "nex-agi": "Nex AGI",
  liquid: "Liquid AI",
  swissai: "Swiss AI",
  nousresearch: "Nous Research",
  "x-ai": "xAI",
  allenai: "Ai2",
  mistralai: "Mistral AI",
  ibm: "IBM",
  arcee: "Arcee AI",
  openai: "OpenAI",
  google: "Google",
  anthropic: "Anthropic",
  deepseek: "DeepSeek",
  nvidia: "NVIDIA",
  minimax: "MiniMax",
  tencent: "Tencent",
  xiaomi: "Xiaomi",
  inclusionai: "InclusionAI",
  stepfun: "StepFun",
  cohere: "Cohere",
  perplexity: "Perplexity",
  aion: "Aion Labs",
  upstage: "Upstage",
  poolside: "Poolside",
  "dots-studio": "Dots Studio",
  perception: "Perceptron",
  "inference-net": "Inference.net",
  "prism-ml": "Prism ML",
  elorian: "Elorian",
  reflection: "Reflection",
  recursive: "Recursive",
  typesafe: "TypeSafe",
  unbiased: "Unbiased",
  scaledown: "ScaleDown",
  inception: "Inception",
  openrouter: "OpenRouter",
  meituan: "Meituan",
  xingchen: "Xingchen AGI",
  thedrummer: "TheDrummer",
  sao10k: "Sao10K",
  gryphe: "Gryphe",
  undi95: "Undi95",
  mancer: "Mancer",
  moondream: "Moondream",
  liquidai: "Liquid AI",
};

/**
 * Labs that do not publish weights for their flagship chat models. Used only as a
 * fallback when neither a Hugging Face id nor an explicit "open-weight" claim exists.
 */
const CLOSED_LABS = new Set([
  "openai",
  "anthropic",
  "google",
  "x-ai",
  "amazon",
  "perplexity",
  "cohere",
  "ai21",
  "writer",
  "relace",
  "morph",
  "scaledown",
  "unbiased",
  "sakana",
  "inception",
  "elorian",
  "typesafe",
  "openrouter",
  "aion",
  "aion-labs",
  "fireworks",
  "mancer",
  "upstage",
  "poolside",
  "kwaikat",
  "longcat",
  "servicenow",
  "snowflake",
  "baidu",
  "agnes-ai",
  "ai9star",
]);

/** Labs whose catalogue is weights-first; only a fallback signal. */
const OPEN_LABS = new Set([
  "meta",
  "deepseek",
  "z-ai",
  "moonshotai",
  "nvidia",
  "minimax",
  "mistralai",
  "tencent",
  "xiaomi",
  "inclusionai",
  "stepfun",
  "thinkingmachines",
  "liquid",
  "thedrummer",
  "nousresearch",
  "sao10k",
  "gryphe",
  "undi95",
  "anthracite",
  "cognitivecomputations",
  "moondream",
  "rekaai",
  "ibm",
  "arcee",
  "bytedance",
  "meituan",
  "xingchen",
  "prism-ml",
  "recursive",
  "reflection",
  "inference-net",
  "nex-agi",
  "microsoft",
  "tiiuae",
  "swissai",
  "allenai",
  "ai21",
  "codestral",
]);

const EFFORT_SUFFIX = /-(max|xhigh|high|medium|low|none|minimal|reasoning|non-reasoning|thinking|instruct|chat|preview|exp|it|pro|ultraspeed|batch|free|beta|alpha|latest)$/;

export function normalizeCreator(author) {
  const key = normalizeSlug(author).replace(/^~/, "");
  return CREATOR_ALIASES[key] ?? key;
}

export function normalizeSlug(input) {
  let s = String(input ?? "").toLowerCase().trim();
  s = s.replace(/\(.*?\)/g, "");
  s = s.replace(/^~/, "");
  s = s.split(":")[0];
  s = s.replace(/[_ .]/g, "-");
  s = s.replace(/-\d{8}$/, "");
  s = s.replace(/[^a-z0-9-]/g, "");
  s = s.replace(/-+/g, "-").replace(/^-|-$/g, "");
  return s;
}

/** Aggressive key: strips reasoning-effort / packaging suffixes and trailing `.0` versions. */
export function modelKey(input) {
  let s = normalizeSlug(input);
  for (let i = 0; i < 4; i += 1) {
    const next = s.replace(EFFORT_SUFFIX, "").replace(/-0$/, "");
    if (next === s) break;
    s = next;
  }
  return s;
}

/** Numeric tokens of a key — used to reject fuzzy matches across versions (v3 vs v4). */
export function versionTokens(key) {
  return key.split("-").filter((t) => /^\d+$/.test(t));
}

/**
 * Two keys describe the same model generation only when their numeric version runs are
 * prefix-compatible: `glm-5-3-flashx` -> [5,3] vs `glm-5-3` -> [5,3] passes, while
 * `hermes-3-llama-3-1` -> [3,3,1] vs `hermes-4-llama-3-1` -> [4,3,1] does not.
 */
function versionCompatible(a, b) {
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  return short.every((token, index) => long[index] === token);
}

/** Dice coefficient on character bigrams — cheap and stable for slug similarity. */
export function similarity(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = (s) => {
    const out = new Map();
    for (let i = 0; i < s.length - 1; i += 1) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) ?? 0) + 1);
    }
    return out;
  };
  const ga = grams(a);
  const gb = grams(b);
  let hits = 0;
  for (const [g, n] of ga) hits += Math.min(n, gb.get(g) ?? 0);
  return (2 * hits) / (a.length - 1 + (b.length - 1));
}

const OPEN_CLAIM = /\bopen[- ]?weights?\b|\bopen[- ]?source\b|\bweights? (are )?(available|released)\b|\bapache[- ]?2\.?0\b|\bmit licen[cs]e\b/i;

/**
 * Classify weight availability.
 * Returns `{ openness: 'open'|'closed'|'unknown', reason }`.
 */
export function classifyOpenness({ author, huggingFaceId, description }) {
  const creator = normalizeCreator(author);
  if (huggingFaceId) return { openness: "open", reason: "huggingface" };
  if (OPEN_CLAIM.test(description ?? "")) return { openness: "open", reason: "description" };
  if (CLOSED_LABS.has(creator) || CLOSED_LABS.has(author)) return { openness: "closed", reason: "lab" };
  if (OPEN_LABS.has(creator)) return { openness: "open", reason: "lab" };
  return { openness: "unknown", reason: "none" };
}

/** OpenRouter prices are USD per token as strings; we expose USD per 1M tokens. */
export function toPricePerMillion(raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n === 0) return 0;
  return Math.round(n * 1_000_000 * 1e6) / 1e6;
}

/** Artificial Analysis mixes 0-1 fractions and 0-100 indices; normalize to 0-100. */
export function toPercent(value) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  const pct = n > 0 && n <= 1 ? n * 100 : n;
  if (pct > 100) return null;
  return Math.round(pct * 10) / 10;
}

/** 3:1 blended price, the industry convention for "typical" token mix. */
export function blendPrice(promptPerM, completionPerM) {
  if (promptPerM === null && completionPerM === null) return null;
  const p = promptPerM ?? 0;
  const c = completionPerM ?? 0;
  return Math.round((p * 0.75 + c * 0.25) * 1e6) / 1e6;
}

export function cacheDiscount(promptPerM, cacheReadPerM) {
  if (promptPerM === null || cacheReadPerM === null || promptPerM <= 0) return null;
  const ratio = 1 - cacheReadPerM / promptPerM;
  return Math.round(ratio * 1000) / 10;
}

export { versionCompatible, CREATOR_ALIASES, CLOSED_LABS, OPEN_LABS };
