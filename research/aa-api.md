# Artificial Analysis (AA) public API — verified dossier

**Purpose:** integration reference for *SOM — LLM Selector*, which needs to join the OpenRouter model catalog with AA benchmark data.
**Research date:** 2026-10-22. All endpoints probed live that day.
**Method:** primary docs + machine-readable OpenAPI contract + live HTTP probes + legal PDFs + third-party OSS schemas. Confidence is graded per claim (`high` / `moderate` / `low` / `UNKNOWN`).

> **Two alerts before anything else**
> 1. **`/api/v2/data/llms/models` (the endpoint you verified) is being retired on 2026-11-04** and will answer `410 Gone` afterwards. All `/api/v2/data/*` paths move to `/api/v2/language/*` and `/api/v2/media/*`. [S4]
> 2. **The Data Platform Terms forbid exactly what a public "model selector" dashboard does** without prior written consent (§2.4(c), §2.5). See §9. Design accordingly.

---

## 1. Endpoints

There are **two coexisting generations** of the public REST API, both on `https://artificialanalysis.ai`, both authenticated with the same key:

- **Legacy v2 "Data API"** — flat paths under `/api/v2/data/…`, `status`-style envelope, no pagination. **Decommissioned 2026-11-04.** [S3][S4]
- **Current v2 API** — resource paths under `/api/v2/language/…` and `/api/v2/media/…`, tiered (`free`/`pro`/`commercial`), `tier`+`pagination` envelope, 31 endpoints in the published contract. [S1][S2]

Live probes without a key (2026-10-22) confirm both families are mounted: `/api/v2/data/llms/models`, `/api/v2/language/models/free`, `/api/v2/language/models`, `/api/v2/language/providers`, `/api/v2/data/media/text-to-image` → `401 {"error":"API key is required"}`; a guessed `/api/v2/data/llms/creators` → `404` (no creators endpoint exists). [S11]

### 1.1 Current generation — language models

| Method | Path | Min tier | Query params | Notes |
|---|---|---|---|---|
| GET | `/api/v2/language/models/free` | Free | `page` | Free-shape list: headline indices only. Accepts any valid key. [S1][S2] |
| GET | `/api/v2/language/models` | **Pro** | `prompt_type`, `page` | Full list incl. per-benchmark scores, blended pricing, percentiles. Free key → `403`. [S2] |
| GET | `/api/v2/language/models/{slug}` | **Pro** | — | Detail: adds `evaluation_token_counts`, `aa_omniscience_breakdown`, `artificial_analysis_openness_index_breakdown`; includes Commercial `providers` array. [S2] |
| GET | `/api/v2/language/models/{slug}/performance` | **Commercial** | `window` (7d/30d/90d, default 90d), `interval` (daily/weekly/monthly, auto) | Performance over time. [S2] |
| GET | `/api/v2/language/providers` | **Commercial** | `page` | Provider-level data. [S2] |
| GET | `/api/v2/language/providers/{slug}` | **Commercial** | — | |
| GET | `/api/v2/language/providers/{slug}/performance` | **Commercial** | `window`, `interval` | |
| GET | `/api/v2/language/providers/{slug}/measurements` | **Commercial** | `window`, `page` | Raw measurements; requires explicit provider grant. [S2] |
| POST | `/api/v2/critpt/evaluate` | approval | — | Code-grading service, **not** data retrieval; 10 req/24h; 403 without approval. [S3] |

`prompt_type` enum (affects the speed/latency numbers you get back): `medium` (1,000 input tokens, 1 query), `long` (**default**, 10,000 tokens, 1 query), `100k` (100,000 tokens, 1 query), `vision_single_image` (1,000 tokens), `medium_parallel` (1,000 tokens, 10 parallel queries). [S2]

### 1.2 Current generation — media (all `GET`, 22 paths)

Free/Pro pairs exist for each family, i.e. `…/models/free` (Free) and `…/models` (Pro):

`/api/v2/media/text-to-image/models[/free]`, `/api/v2/media/image-editing/models[/free]`, `/api/v2/media/text-to-video/models[/free]`, `/api/v2/media/image-to-video/models[/free]`, `/api/v2/media/text-to-video-audio/models[/free]`, `/api/v2/media/image-to-video-audio/models[/free]`, `/api/v2/media/text-to-speech/models[/free]`, `/api/v2/media/speech-to-speech/models[/free]`, `/api/v2/media/speech-to-text/models[/free]`, `/api/v2/media/music/instrumental/models[/free]`, `/api/v2/media/music/with-vocals/models[/free]`. Extra query params: `include_categories`, `include_genres` (Pro). [S2]

Also available: an **MCP server** at `https://mcp.artificialanalysis.ai/mcp` (OAuth instead of a key, **double** the call quota). [S1]

### 1.3 Legacy generation (retiring 2026-11-04)

| Legacy path | Free replacement | Pro replacement |
|---|---|---|
| `/api/v2/data/llms/models` | `/api/v2/language/models/free` | `/api/v2/language/models` |
| `/api/v2/data/media/text-to-image` | `/api/v2/media/text-to-image/models/free` | `/api/v2/media/text-to-image/models` |
| `/api/v2/data/media/image-editing` | `/api/v2/media/image-editing/models/free` | `…/models` |
| `/api/v2/data/media/text-to-video` | `/api/v2/media/text-to-video/models/free` | `…/models` |
| `/api/v2/data/media/image-to-video` | `/api/v2/media/image-to-video/models/free` | `…/models` |
| `/api/v2/data/media/text-to-speech` | `/api/v2/media/text-to-speech/models/free` | `…/models` |

After the deadline legacy requests return **410 Gone** with a link to the migration guide. Keys are unchanged. [S4]

There is **no `/creators` endpoint** (the docs recommend using model/creator *IDs* as primary identifiers, but creators arrive embedded in each model object). [S3][S11]

---

## 2. Authentication, envelope, pagination

### 2.1 Auth

```
GET https://artificialanalysis.ai/api/v2/language/models/free
x-api-key: aa_…
```

- Header name is exactly **`x-api-key`** (no `Authorization: Bearer`). Keys are created in the AA *Insights Platform* → API key management. [S1][S3]
- Keys belong to an **organisation**; regenerating revokes the previous key immediately; keys must stay server-side. [S1]
- `401` = missing/invalid key. `403` = tier doesn't cover the endpoint (or CritPt approval missing). `404` = bad slug. `429` = daily quota exhausted. [S1]

### 2.2 Response envelope

Current generation — one shared envelope (`LLMModelsFreeResponse` / `LLMModelsResponse`):

```json
{
  "tier": "free",
  "intelligence_index_version": 4.1,
  "pagination": { "page": 1, "page_size": 200, "total_pages": 2, "has_more": true },
  "data": [ { …model… } ]
}
```

- `tier` mirrors the `X-AA-Tier` response header (`free`|`pro`|`commercial`). [S1][S2]
- `intelligence_index_version` is the major.minor version the index scores belong to (patch not represented; current methodology v4.3.2). [S1][S2]
- `pagination` appears **on list endpoints only**; `page_size` is 200 in the published example (not a documented parameter — only `page` is). [S2]
- Errors: `{ "error": "…", "details": {…}? }`. [S1]

Legacy generation — different envelope, **no pagination**:

```json
{ "status": 200, "prompt_options": { "parallel_queries": 1, "prompt_length": "medium" }, "data": [ … ] }
```

Confidence `high`: appears verbatim in the legacy docs and in two independent OSS integrations that model the legacy response. [S3][S12][S13]

Practical detection: body has `tier` + `pagination` → current; body has `status` + `prompt_options` → legacy. (Until 2026-11-04 you may still receive the legacy shape; after, only the new one.) [S2][S3][S4]

### 2.3 Response headers

`X-AA-Tier` (free|pro|commercial), `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (Unix timestamp of window end), `Retry-After` (on 429, seconds). [S1][S2]

Known doc-level contradictions (both still published):

| Topic | Current docs / contract | Legacy page | Resolution |
|---|---|---|---|
| `X-RateLimit-Reset` format | "Unix timestamp when the fixed 24-hour window ends" | "Human-readable date string", with a `429` body of `{error, limit, remaining, reset:"Wed Jan 01 2025 …", retryAfter}` | Parse defensively: if numeric → epoch, else → `Date.parse()`; prefer `Retry-After` |
| Free daily quota | 100 requests / 24 h | 1,000 requests per day | Assume 100, read `X-RateLimit-Limit` at runtime |
| Default prompt length | `prompt_type` default `long` (10k tokens) | `prompt_length` defaults to `medium` (1k) | Data from different eras is not directly comparable |
| Envelope | `tier` + `pagination` + `data` | `status` + `prompt_options` + `data` (no pagination) | Feature-detect (§2.2) |


---

## 3. Rate limits and free tier

| Tier | REST requests / 24 h | MCP tool calls | Access |
|---|---|---|---|
| **Free** | **100** | 200 | `/free` model lists |
| **Pro** | 500 | 1,000 | all model-level endpoints |
| **Commercial** | custom (1,000/day base package per plans page) | 2,000 | + provider-level, performance-over-time, raw measurements |
| CritPt grader | 10 requests/day | — | approval only |

- Windows are **fixed 24 h**, starting with the first request after the previous window ended; the quota does not roll per hour. [S1][S2]
- Quota is shared by **scope** (one user in an org, or the whole org), not per key. [S1]
- A free tier exists: sign up, create a key, `$0`. [S1][S5]

**Discrepancy (resolved):** the legacy API-reference page still says "rate-limited to 1,000 requests per day" [S3], while the current docs and plans page say **100/day** for Free [S1][S5]. Treat the legacy figure as stale (it describes the pre-V2 keys); read `X-RateLimit-Limit` at runtime and do not assume 1,000. Confidence `moderate` (two current pages agree; AA has not published a changelog note about the cut).

---

## 4. Evaluation fields — meaning, scale, direction

### 4.1 Scale conventions

- **Composite indices are on a 0–100 scale**: published examples show `artificial_analysis_intelligence_index` 62.9, 24.5; `artificial_analysis_coding_index` 55.8; `artificial_analysis_math_index` 87.2; capability indices 4.8–11.7. AA never states "0–100" in words. Confidence `moderate`: every published sample and the UI are consistent, and the index is a weighted average of 0–1 components (×100 would give this range), but no doc sentence fixes the bounds. Do not assume clamping to 100 is safe. [S2][S3][S6]
- **Individual benchmark scores are 0–1 fractions** (not percentages): `mmlu_pro` 0.791, `gpqa` 0.748, `hle` 0.087, `livecodebench` 0.717, `math_500` 0.973; the contract even says `gdpval_aa_normalized` is "normalized to a 0-1 scale, used in the Intelligence Index". Confidence `high`. [S2][S3]
- **Elo fields are Elo points**, not fractions: `aa_briefcase_elo` 612, `gdpval_aa_elo` 681; the Elo scale is anchored (GDPval-AA v2.1 pins DeepSeek V4.1 Flash (max) at 1600; earlier text pins GPT-5.5 (medium) at 1000). [S2][S6]
- **Nulls mean "not measured" or "not applicable"; they never mean zero.** [S1][S2]
- Direction: every accuracy/pass-rate/Elo/index field is **higher-is-better**; every `time_to_*` field and every price field is **lower-is-better**.

### 4.2 Composite indices

| Field | Meaning | Scale | Direction | Availability |
|---|---|---|---|---|
| `artificial_analysis_intelligence_index` | Weighted composite of 10 evals — v4.3.2: Agents 30%, Coding 20%, Scientific Reasoning 20%, General 30% (AA-Briefcase v1.1, GDPval-AA v2.1, AutomationBench-AA, Terminal-Bench 4.0, SciCode, AA-LCR v1.1, AA-Omniscience, HLE, GDP.pdf, CritPt) | 0–100 | higher | Free |
| `artificial_analysis_coding_index` | Coding subset of the above; **not separately versioned** | 0–100 | higher | Free |
| `artificial_analysis_agentic_index` | Agentic subset; not separately versioned | 0–100 | higher | Free |
| `artificial_analysis_math_index` | Math index — **only in the legacy endpoint; absent from the new contract**; AA has retired MATH-500/AIME from active reporting | 0–100 | higher | Legacy only |
| `artificial_analysis_{finance_and_accounting,strategy_and_ops,legal,healthcare_and_medical,engineering,economics}_index` | Six profession capability indices; weighted mixes of Omniscience/GDPval/AA-Briefcase/HLE/AutomationBench/LCR/GDP.pdf/MLCR (composition per index documented) | 0–100 | higher | Free |
| `artificial_analysis_openness_index` | Openness (model transparency/weights) | 0–100 observed (38.9); **not explicitly documented** — `moderate` | higher = more open | Pro |
| `artificial_analysis_multilingual_index` | Multilingual capability | 0–1 observed (0.752); legacy variant carried a `_normalized` suffix | higher | Pro |

Versioning caveat that matters for a dashboard: index composition changes; scores are only comparable **within the same major version**, and the response tells you which version produced them (`intelligence_index_version`). Patch bumps can change scores without changing that field. [S1][S2]

### 4.3 Individual benchmarks

Legend: legacy = field exists only on `/api/v2/data/llms/models` (dead 2026-11-04); new = field in the current contract.

| Requested name | Field (legacy) | Field (current) | What it measures | Scale |
|---|---|---|---|---|
| MMLU-Pro | `mmlu_pro` | **absent** (retired from reporting; removed from index in v4.0) | 10-option multi-domain knowledge MCQ, pass@1 | 0–1 |
| GPQA | `gpqa` | `gpqa_diamond` | GPQA Diamond, 198-question science MCQ, pass@1 | 0–1 |
| HLE | `hle` | `hle` | Humanity's Last Exam; expert-level closed questions | 0–1 |
| LiveCodeBench | `livecodebench` | **absent** (retired; removed in v4.0) | Python code gen from LeetCode/AtCoder/Codeforces, pass@1 | 0–1 |
| SciCode | `scicode` | `scicode` | Scientific code generation, step-graded | 0–1 |
| MATH-500 | `math_500` | **absent** (retired) | Competition maths subset, 500 problems | 0–1 |
| AIME (2024) | `aime` | **absent** (AIME 2025 retired; `aime` = earlier-year variant) | AIME, pass@1 with repeats | 0–1 |
| AIME 2025 | `aime_25` | **absent** (retired from active reporting in v4.3.2) | AIME 2025 I/II, strict integer answer, pass@1 @10 repeats | 0–1 |
| IFBench | `ifbench` | `ifbench` | Instruction-following benchmark | 0–1 |
| LCR | `lcr` | `aa_lcr` | AA-LCR, long-context reasoning | 0–1 |
| τ²-bench | `tau2` | `tau2_telecom` | τ²-Bench Telecom (agentic tool use, telecom) | 0–1 |
| τ³-bench | `tau_banking` | `tau_banking` | τ³-Banking (fintech support agent); dropped from the index in v4.3, still run | 0–1 |
| Terminal-Bench Hard | `terminalbench_hard` | `terminalbench_hard` | Hard subset of Terminal-Bench | 0–1 |
| Terminal-Bench 2.1 | — | `terminalbench_v2_1` | Terminal-Bench 2.1 | 0–1 |
| Terminal-Bench 4.0 | — | `terminalbench_v4_0` | Terminal-Bench 4.0 — **in the current index** | 0–1 |

Other fields in the current contract (Pro), useful for a selector UI: `terminalbench_science`, `automationbench_aa` (partial score), `gdp_pdf` (all-pass), `aa_briefcase_elo` (Elo), `gdpval_aa_elo` (Elo), `gdpval_aa_normalized` (0–1), `critpt`, `mmmu_pro` (visual reasoning), `mlcr_overall` (medical long-context pass rate), `aa_omniscience_accuracy` (0–1), `aa_omniscience_non_hallucination_rate` (0–1, legacy name `…_hallucination_rate` inverted), and `aa_omniscience_index` (**signed**, can be negative, e.g. −63.92: rewards correct answers, penalises hallucinations, abstentions neutral — documented range `UNKNOWN`, do not clamp to 0). [S2][S6][S12][S13]

**Field-name drift is real**: `gpqa`→`gpqa_diamond`, `tau2`→`tau2_telecom`, `lcr`→`aa_lcr`, `median_time_to_first_answer_token`→`…_seconds` (inside a `performance` object). Write a mapping layer, not a direct passthrough.

Confidence on the per-benchmark descriptions: `high` for names/scales (contract + examples), `moderate` for the one-line "what it measures" summaries (methodology prose, not per-field docs).

---

## 5. Pricing fields

| Field | Unit | Notes |
|---|---|---|
| `price_1m_input_tokens` | **USD per 1,000,000 input tokens** | Null when pricing unavailable. Free tier. |
| `price_1m_output_tokens` | **USD per 1,000,000 output tokens** | Free tier. |
| `price_1m_blended_3_to_1` | USD per 1M tokens, blended **3:1 input:output** | **Pro only** in the current API; present in the legacy free response. Nil when pricing missing. |
| `price_1m_blended_7_to_2_to_1` | USD per 1M tokens, blended **7:2:1 cache-hit:input:output** | Pro only. |
| `price_1m_cache_hit_tokens`, `price_1m_cache_write_tokens` | USD per 1M tokens | **Now in the Free contract** (not in legacy). Null when the provider reports no cache pricing. |

Blend formulas **verified arithmetically against published examples** (confidence `high`):

- 3:1 blend = `(3·input + 1·output) / 4`. Check: o3-mini `input 1.1, output 4.4 → (3.3+4.4)/4 = 1.925` — exactly the published value; gpt-oss-20b `input 0.06, output 0.2 → 0.095`, published as `0.09` (2-dp rounding).
- 7:2:1 blend = `(7·cache_hit + 2·input + 1·output) / 10`. Check: gpt-oss-20b `cache_hit 0.015, input 0.06, output 0.2 → (0.105+0.12+0.2)/10 = 0.0425`, published as `0.04` (rounding).

Caveats: prices are **model-level aggregates across the providers AA tracks** (the aggregation rule is not documented — only performance is explicitly a *median*), so they will not match an OpenRouter provider quote token-for-token. Confidence `moderate` on the aggregation rule, `high` on the units. `price_1m_blended_3_to_1` is a *derived presentation* number; recompute it yourself if you need a different ratio. [S2][S3]

---

## 6. Speed / latency fields

| Field (legacy top-level) | Field (current, inside `performance`) | Unit | Direction |
|---|---|---|---|
| `median_output_tokens_per_second` | `median_output_tokens_per_second` | output tokens/s | higher better |
| `median_time_to_first_token_seconds` | `median_time_to_first_token_seconds` | seconds to first token streamed (AA keeps it distinct from the *answer* token, so reasoning tokens are usually counted here) — `moderate` | lower better |
| `median_time_to_first_answer_token` | `median_time_to_first_answer_token_seconds` | seconds to first **visible answer** token | lower better |
| — | `median_end_to_end_response_time_seconds` | seconds for a full answer | lower better |
| — | `percentile_05/quartile_25/quartile_75/percentile_95_*` (output tps and TTFT) | same units | Pro only |

Caveats that will bite a dashboard:

1. **Prompt preset changes the numbers.** Current API: `prompt_type` defaults to `long` = 10,000 input tokens; `medium` = 1,000. The **legacy** docs say `prompt_length` defaults to `medium` (1k). The free list endpoint exposes **no** `prompt_type` parameter, so which preset produced its medians is `UNKNOWN` from the body (the legacy body echoed `prompt_options`; the new body does not). [S2][S3]
2. **End-to-end response time assumes 500 answer tokens** unless the field name says otherwise. [S1][S2]
3. Values are **medians across all providers serving that model**, so a fast/cheap provider and a slow one are averaged away; provider-level medians are Commercial-only. [S2]
4. Missing measurements are documented as `null`, but at least one OSS consumer explicitly treats `0` as a missing-data sentinel for the three legacy speed fields — defensively treat `0` as null too. Confidence `low`–`moderate` (third-party observation, not AA documentation). [S13]

---

## 7. Free tier vs paid — what you actually get

| Capability | Free | Pro | Commercial |
|---|---|---|---|
| Headline indices (Intelligence, Coding, Agentic) | ✅ | ✅ | ✅ |
| Six capability indices | ✅ | ✅ | ✅ |
| Input/output token pricing | ✅ | ✅ | ✅ |
| Cache hit / cache write pricing | ✅ (new API) | ✅ | ✅ |
| Median performance metrics | ✅ | ✅ | ✅ |
| `context_window_tokens`, `parameters`, `modalities`, `licensing.is_open_weights`, `huggingface_url`, `reasoning_model`, creator `country` | ❌ | ✅ | ✅ |
| **`openrouter_api_id`** | ❌ | ✅ | ✅ |
| Individual benchmark scores | ❌ | ✅ | ✅ |
| Blended pricing fields | ❌ | ✅ | ✅ |
| Performance percentiles (P5–P95) | ❌ | ✅ | ✅ |
| Omniscience / openness breakdowns, token counts | ❌ | ✅ (detail endpoint) | ✅ |
| Provider-level data (per-provider price/speed/context) | ❌ | ❌ | ✅ |
| Performance over time (7/30/90 d) | ❌ | ❌ | ✅ |
| Raw measurements | ❌ | ❌ | ✅ (approved providers) |

Confidence `high` (contract marks each field "Pro tier only / omitted on Free tier"; plans page matches). [S1][S2][S5]

### What the UI shows that the API does not (or not for free)

- Everything in the table above that is gated: modalities, `is_open_weights`, context window, parameter counts, HF URL, per-provider pricing/speed charts, performance-over-time, raw measurements, full evaluation breakdowns.
- The **UI's per-provider pricing/speed tables** are the biggest gap: Free/Pro give one median per model, not the provider spread that AA's site visualises. [S2]
- `UNKNOWN`: whether AA's UI-only derived views (e.g. cost-to-run-a-task calculator outputs beyond `artificial_analysis_intelligence_index_cost`, or "Openness Index 8-component breakdown" per the plans table) are all reachable via the documented Pro endpoints. The contract exposes `artificial_analysis_openness_index_breakdown` only on the detail endpoint, and the plans table lists the breakdown as a paid feature — treat additional UI-only aggregates as `UNKNOWN` and don't assume them. [S2][S5]

---

## 8. Joining an AA model to an OpenRouter model slug

### Verified facts

- AA model objects carry: `id` (UUID, stable), `name` (display, changes), `slug` (AA's own slug, "infrequently changed"), `model_creator{id,name}` (new API — **no creator slug**), and in the legacy shape `model_creator.slug`. AA explicitly recommends **model and creator IDs** as primary identifiers because slugs/names change. [S3]
- **`openrouter_api_id` exists** in the current contract: `"openrouter_api_id": "openai/gpt-oss-20b"` — described as "OpenRouter API model identifier when available", **Pro tier only, omitted on Free, null when unknown**. [S2]
- OpenRouter's public catalog (`GET https://openrouter.ai/api/v1/models`, no auth, 468 models on 2026-10-22) exposes `id` (`"openai/gpt-oss-20b"`, variant form `"recursive/flint-v1.0:free"`), `canonical_slug` (`"deepseek/deepseek-v4.1-flash-20261017"` — date-stamped), `name`, `hugging_face_id`, `created`, `context_length`, `architecture`, `pricing`, `supported_parameters`. [S10]
- Therefore: `openrouter_api_id` is **exactly the OpenRouter `id`** (base form, no `:variant` suffix). Confidence `high` for the format match; `moderate` that AA always stores the base id when OpenRouter has variants.

### Recommended join ladder (best → worst)

1. **Exact:** `aa.openrouter_api_id === or.id` (Pro key). Highest precision; ~free.
2. **Variant-normalised:** strip OpenRouter's `:free`/`:thinking`/`:extended` suffix → compare to `openrouter_api_id`.
3. **Hugging Face bridge (open-weights only):** `aa.huggingface_url` ends with the repo id → compare to `or.hugging_face_id` (case-insensitive). Pro only. Good for Llama/Qwen/DeepSeek families where names drift.
4. **Constructed slug:** `slugify(aa.model_creator.name) + "/" + aa.slug` compared to `or.id`. Needs a creator-alias table because AA creator names are display names: `OpenAI → openai`, `Meta → meta-llama` (OpenRouter), `Google → google`, `xAI → x-ai`, `Mistral → mistralai`, `Alibaba → qwen`, `DeepSeek → deepseek`, `Moonshot AI → moonshotai`, `Z.AI → z-ai`. Derived, not documented → confidence `moderate`, and it *will* miss.
5. **Normalised token match:** lowercase, strip non-alphanumerics, drop effort/reasoning suffixes (`(high)`, `(max)`, `(xhigh)`, `(thinking)`), drop date suffixes (`-20261017`), compare token sets within the same creator. Use `aa.release_date` and `or.created` as a tie-breaker.
6. **Manual alias table** checked into the repo for the residue, plus a "no match" state in the UI (never silently guess).

### Traps

- AA `name` carries reasoning-effort qualifiers (`"gpt-oss-20B (high)"`) while `slug` is clean (`gpt-oss-20b`); OpenRouter encodes effort as separate models or `:thinking`. Match on `slug`, never on `name`.
- AA media slugs are lossy (`"openai-gpt_gpt-image-1--high"`), so don't reuse the LLM heuristic for image models.
- `canonical_slug` is date-stamped — never compare it to an AA slug.
- The free tier gives you **no** `openrouter_api_id` and no creator slug → free-tier joining is heuristic-only. That is a design decision, not a bug: either require a Pro key for the join, or ship the alias table with the heuristics.

---

## 9. Licensing, attribution, fair use

### What AA says in the API docs

- "Use of the API requires **attribution across all tiers**. When you display or share API data, credit **Artificial Analysis** as the source. A visible byline or footer link is sufficient." [S1][S2]
- Legacy page: "Attribution is required for all use of our free API. Please provide attribution to https://artificialanalysis.ai/." Brand kit available. [S3]
- Use is subject to the **Terms of Use** and the **Data Platform Terms** (Pro/Commercial). Redistribution or bespoke terms → contact AA. [S1][S2][S5]

### What the Data Platform Terms actually require (exact strings)

- Data & metrics: **"Source: Artificial Analysis (artificialanalysis.ai)"** with a hyperlink where feasible. [S8]
- Charts & visualisations: **the AA logo must be visible on the chart**. [S8]
- Derived data: **"Based on data from Artificial Analysis"** plus a **non-endorsement statement** ("created by [you], does not represent the views or endorsement of Artificial Analysis"). [S8]
- Non-endorsement is a standalone obligation (§5.2): no implying AA validates your analysis. [S8]

### Restrictions that conflict with this project

| Clause | Text (abridged) | Impact |
|---|---|---|
| §2.4(c) | may not "embed or otherwise make raw Data available through any customer-facing product, API, dashboard, or service" | A hosted dashboard rendering AA scores is inside the prohibition |
| §2.4(d) | may not combine Data with third-party sources to create a product made available to third parties | Merging AA + OpenRouter is named conduct |
| §2.5 | may not use Data to "develop, operate, or improve any product… whose primary purpose is benchmarking, ranking, comparison, competitive intelligence, or **model/provider selection guidance**" without prior written consent; (a) bars creating a **Competitive Product**, defined (§1.9) as a product whose primary purpose is benchmarking/ranking/comparison/selection guidance for AI models | This is a literal description of "SOM — LLM Selector" |
| §2.6(c) | no sharing API credentials | Don't ship a shared AA key in a public instance |
| §3.1 | no altering/reframing data while implying AA origin | Don't renormalise and label it AA |

Plans page wording is the plain-language version: Free = **"Internal use only with attribution; no redistribution"**; Pro = **"Restricted external use"**; Commercial = **"Commercial redistribution with attribution"**. [S5] Terms of Use separately grant a "personal, noncommercial" licence for the *site* and prohibit scraping/automated mining outside the API. [S9]

### Engineering mitigations (not legal advice)

1. **Bring-your-own-key (BYOK)** as the default and documented mode: each operator supplies their own AA key; the project never ships a shared key and never bundles AA data.
2. **Never commit AA responses** (fixtures, seed JSON, cached dumps) to the repo; if you need test fixtures, synthesise obviously fake numbers.
3. **Runtime fetch + short-lived cache** (e.g. 6–24 h) to respect the 100/day free quota; expose `X-RateLimit-Remaining` in the UI and degrade gracefully on `429` (honour `Retry-After`).
4. **Attribution as a product feature**: persistent footer "Source: Artificial Analysis (artificialanalysis.ai)" with link, non-endorsement line, and a "based on data from" label on derived views. If a hosted public instance is planned, **email AA for consent / Commercial terms before launch** — the migration page explicitly offers to "help with redistribution rights". [S4][S8]
5. Keep OpenRouter and AA data visually attributable and clearly sourced; don't present merged scores as AA output.

---

## 10. Practical integration recipe for SOM

1. Target `/api/v2/language/models/free` **today** (not `/api/v2/data/llms/models`); feature-detect the envelope, tolerate the legacy shape until 2026-11-04.
2. Persist `id` (AA UUID) as the primary key, keep `slug` and `name` as display aliases.
3. Store `intelligence_index_version` with every score row and show it; refuse to compare across major versions silently.
4. Normalise: indices as 0–100; benchmark fields as 0–1 → multiply by 100 **for display only, never rewrite the value** (§3.1 data-integrity clause).
5. Recompute `price_1m_blended_3_to_1` yourself if you need a different ratio; treat nulls as unknown, and `0` in speed fields as unknown.
6. Join to OpenRouter via `openrouter_api_id` when a Pro key is present; else the ladder in §8 with an explicit "unmatched" bucket.
7. Quota budget: 100 calls/24 h on Free, one page = 200 models → **one call covers ~200 models**; paginate (`page`) only as needed; a full refresh is 1–3 calls.
8. Surface AA attribution + non-endorsement in the footer and in exports.

---

## 11. Sources

| ID | Source | Type | Level | Read |
|---|---|---|---|---|
| S1 | Artificial Analysis — *Data API docs* https://artificialanalysis.ai/data-api/docs | primary docs | A | full text |
| S2 | Artificial Analysis — *OpenAPI contract v2.0* https://artificialanalysis.ai/api/v2/openapi | primary machine-readable contract | A | full (paths, params, schemas) |
| S3 | Artificial Analysis — *API Reference* (legacy free API) https://artificialanalysis.ai/api-reference | primary docs (legacy) | A | full text |
| S4 | Artificial Analysis — *Legacy Data API endpoints retire November 4, 2026* https://artificialanalysis.ai/data-api/migrate-v2-data | primary docs | A | full text |
| S5 | Artificial Analysis — *Data API: plans / access paths* https://artificialanalysis.ai/data-api | primary marketing+plans | A/B | full text |
| S6 | Artificial Analysis — *Intelligence Benchmarking methodology* https://artificialanalysis.ai/methodology/intelligence-benchmarking | primary methodology | A | targeted sections |
| S7 | Artificial Analysis — *Capability Indexes methodology* https://artificialanalysis.ai/methodology/capability-indices | primary methodology | A | full text |
| S8 | Artificial Analysis — *Pro Data Platform Terms* (PDF) https://artificialanalysiscdn.com/legal/ProDataPlatformTerms.pdf | legal | A | full text |
| S9 | Artificial Analysis — *Terms of Use* (PDF) https://artificialanalysis.ai/docs/legal/Terms-of-Use.pdf | legal | A | grep + sections |
| S10 | OpenRouter — *Models API* https://openrouter.ai/api/v1/models | primary API | A | live JSON |
| S11 | Own live probes 2026-10-22 (`curl` without key; 401/404 matrix) | measurement | A | full |
| S12 | OSS schema of legacy response — https://github.com/Rheosoph/flow-like/blob/main/tools/model-eval/types.ts | third-party code | B | file |
| S13 | OSS transform of legacy response — https://github.com/reyamira/models/blob/main/src/bin/transform/aa.rs | third-party code | B | file |
| S14 | OSS integration using the legacy endpoint — https://github.com/patchy631/ai-engineering-hub/blob/main/hugging-face-skills/skills/hugging-face-evaluation/examples/artificial_analysis_to_hub.py | third-party code | B | file |

## 12. Confidence summary & explicit unknowns

| Claim | Confidence |
|---|---|
| Endpoint inventory, tiers, 403 gating | high (contract + docs + probes) |
| `x-api-key`, envelope `tier`/`pagination`/`data`, headers | high |
| Legacy retirement 2026-11-04 → 410 | high |
| Rate limit 100/day Free, 500/day Pro, MCP ×2 | high (current docs) / stale 1,000/day legacy figure noted |
| Benchmarks as 0–1 fractions; Elo in points | high |
| Composite indices 0–100 | moderate (consistent samples/UI, no explicit doc statement) |
| Blended price formulas | high (arithmetic verification) |
| §2.4/§2.5 licensing conflicts | high (verbatim legal text) |
| `openrouter_api_id` = OpenRouter `id`, Pro-only | high (field + example + OR catalog format) |
| Creator-slug absence in the new API | high (schema) |
| Which `prompt_type` produced Free-tier speed medians | **UNKNOWN** |
| `aa_omniscience_index` documented range | **UNKNOWN** (signed, negative values observed) |
| Whether legacy fields (`mmlu_pro`, `aime`, …) still return fresh 2026 data before retirement | **UNKNOWN** (fields retired from AA reporting; endpoint returns old shape) |
| Live response body shape today (legacy vs new) at `/api/v2/data/llms/models` | **UNKNOWN** — no key available in this environment; verify with one `curl` before coding |
| Any UI-only aggregate beyond the documented fields (cost calculators, openness components) | **UNKNOWN** |
| Legacy endpoint query parameters beyond documented defaults | **UNKNOWN** (none documented) |

## 13. Method notes

Primary documentation and the OpenAPI contract were read in full; the two legal PDFs were read in full/section. The Tavily deep-research kickoff created `pesquisas/2026-10-22-artificial-analysis-api-v2-data-llms-models-endpoints-auth-f.md`, which holds the brief, FAQ and round log. Search budget: 2 Tavily searches (kickoff + one corroboration that surfaced the migration page); the rest is primary-source retrieval plus GitHub code search (`gh api search/code`, 5 queries) for real-world legacy schemas. One factual conflict was found and resolved (1,000 vs 100 requests/day) and recorded; one ambiguity (prompt preset on the Free endpoint) could not be resolved without a key and is marked UNKNOWN.
