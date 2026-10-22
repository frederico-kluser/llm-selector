# OpenRouter benchmark & performance data — what OpenRouter itself publishes (2026)

Research date: **2026-10-22** (server `date` header: `Thu, 22 Oct 2026 14:57:21 GMT`).
Who did the probing: anonymous HTTPS client (no OpenRouter credits/API key available in this
environment — see §7), plus the published OpenAPI spec and docs. Every endpoint below was
called live unless explicitly marked **DOC-ONLY**.

Confidence legend: **HIGH** = live HTTP evidence (status + parsed body) or verbatim spec/doc text;
**MEDIUM** = live behaviour observed but semantics inferred; **LOW/UNKNOWN** = not verifiable here.

---

## 0. TL;DR

OpenRouter in 2026 publishes **six** distinct benchmark/performance surfaces:

| # | Surface | Auth | Scale | Verdict for the app |
|---|---|---|---|---|
| 1 | `benchmarks` object embedded in `GET /api/v1/models` | none | AA indices 0–100; Design Arena ELO ~750–1476; win_rate 0–100 | **Primary, free, already in the payload you fetch** |
| 2 | `GET /api/v1/benchmarks` (unified AA + Design Arena + OpenRouter evals) | API key | AA 0–100, DA win_rate 0–100, OpenRouter `primary_score` 0–1 | **The richest documented source**; needs a key, 30 rpm / 500 per day |
| 3 | `?sort=` rankings on `/api/v1/models` (12 modes incl. 4 benchmark sorts) | none | n/a (ordering only) | Free relevance signal; do **not** treat as data |
| 4 | `/api/v1/datasets/*` (usage rankings), `/api/v1/classifications/task` | API key | tokens (strings), shares 0–1 | CC BY 4.0 usage/popularity, not quality |
| 5 | `GET /api/v1/models/{author}/{slug}/endpoints` (uptime, quantization, latency/throughput percentiles) | none, **perf only with key** | uptime %, latency ms, throughput tok/s | Free uptime/quantization; **perf percentiles are auth-gated and were null anonymously** |
| 6 | `openrouter.ai/api/frontend/v1/rankings/*` (what the website itself uses) | none | mixed | Undocumented (no contract); useful mirror of `/rankings`, incl. a full benchmark dataset |

Key 2026 insight: **the app does not need Artificial Analysis' own API to get AA scores** —
OpenRouter embeds `artificial_analysis.{intelligence,coding,agentic}_index` for 286/468 models and
serves a documented unified benchmark endpoint. Design Arena is also embedded (180 models,
1712 arena×category rows) and is what `design-arena-elo-high-to-low` orders by.

---

## 1. `GET https://openrouter.ai/api/v1/models` — benchmark/quality fields

### 1.1 Live evidence

```
GET https://openrouter.ai/api/v1/models
HTTP/2 200
content-type: application/json
access-control-allow-origin: *
cache-control: public, max-age=120, stale-while-revalidate=3600, stale-if-error=3600
cf-cache-status: HIT
age: 78
vary: Host, User-Agent, Originator, Anthropic-Version
access-control-expose-headers: X-Generation-Id,X-Provider-Name,request-id,cf-ray
(no ETag, no Last-Modified)
size: 787 505 bytes   n(data): 468   top-level keys: data, total_count, links
links = {"next": null}
```

**HIGH confidence.** No `ETag` header; a conditional request with a bogus `If-None-Match` still
returned `200` (no 304 support observed).

### 1.2 Model object — complete key list (frequency over 468 models)

`id, canonical_slug, hugging_face_id, name, created, description, context_length, architecture,
pricing, top_provider, per_request_limits, supported_parameters, default_parameters,
supported_voices, knowledge_cutoff, expiration_date, links, reasoning (336), benchmarks (303),
alias_target (19)`

Everything except `benchmarks`/`reasoning`/`alias_target` is present on all 468 rows.
`alias_target = {slug, name}` identifies `~latest`-style aliases (19 rows) — see S14.

### 1.3 `benchmarks` — exact JSON paths

| JSON path | Type | Present on | Scale / range observed | Notes |
|---|---|---|---|---|
| `data[].benchmarks` | object | 303 / 468 | — | **Absent entirely** on 165 models ("Omitted when no benchmark data is available", S14) |
| `data[].benchmarks.design_arena` | **array** | 303 (always present when `benchmarks` exists) | — | Empty array `[]` when the model has no arena rows (123 of 303) |
| `data[].benchmarks.design_arena[].arena` | string | 1712 rows | `"models"` (1195), `"agents"` (517) | No `builders` value in this payload |
| `data[].benchmarks.design_arena[].category` | string | 1712 rows | 27 distinct values, see below | |
| `data[].benchmarks.design_arena[].elo` | number (int) | 1712 rows | **750 … 1476** | ELO, higher better |
| `data[].benchmarks.design_arena[].win_rate` | number | 1524 float + 188 int | **18.9 … 75** | **Percentage 0–100**, not 0–1 |
| `data[].benchmarks.design_arena[].rank` | integer | 1712 rows | **1 … 146** | Rank within arena+category among models on OpenRouter (1 = best) |
| `data[].benchmarks.artificial_analysis` | object | 286 / 468 | — | **Optional** (docs: not in `required`) |
| `data[].benchmarks.artificial_analysis.intelligence_index` | number\|null | 286 non-null, 0 null | **3.8 … 57.6** | Composite, **0–100** scale |
| `data[].benchmarks.artificial_analysis.coding_index` | number\|null | 164 non-null, 122 null | **2.7 … 81.6** | 0–100 |
| `data[].benchmarks.artificial_analysis.agentic_index` | number\|null | 126 non-null, 160 null | **0.1 … 57.9** | 0–100 |

Verbatim shape (model `deepseek/deepseek-v4.1-flash-1017`, 2026-10-22):

```json
"benchmarks": {
  "design_arena": [
    {"arena": "agents", "category": "spreadsheet", "elo": 1255, "win_rate": 51.2, "rank": 8},
    {"arena": "models",  "category": "3d",          "elo": 1358, "win_rate": 60,   "rank": 9}
  ],
  "artificial_analysis": {
    "intelligence_index": 42.7, "coding_index": null, "agentic_index": null
  }
}
```

`design_arena` categories seen in `/models` (27): `3d, androidnative, asciiart, blender3d,
codecategories, dataviz, fullstack, gamedev, godotgamedev, graphicdesign, htmlslides, image,
imageediting, logo, mobileapps, pptxslides, python-pptxslides, spreadsheet, svg, uicomponent,
webapps, website, agenticgamedev, agentichtmlslides, agenticslides(html),
agenticslides(python-pptx), agenticslides`.
Arena → categories: `models` = {3d, asciiart, codecategories, dataviz, gamedev, graphicdesign,
image, imageediting, logo, svg, uicomponent, website}; `agents` = {the rest}.
The frontend mirror (§2.6) additionally carries `models-audiorealism`, `models-text-to-speech`,
`models-video`-style keys that `/models` does not expose — so `/models` is a **subset** of Design
Arena data (confidence HIGH for the subset claim, MEDIUM for the taxonomy being exhaustive).

### 1.4 Other quality-adjacent fields in the same payload

| Path | Meaning | Scale |
|---|---|---|
| `data[].reasoning` | `{mandatory, supported_efforts[], default_effort}` | n/a (336 models) |
| `data[].top_provider.{context_length,max_completion_tokens,is_moderated}` | capability | tokens / bool |
| `data[].knowledge_cutoff` | `YYYY-MM-DD` \| null | n/a |
| `data[].pricing.{prompt,completion,input_cache_read,request,image,...}` | USD **per token as strings** | e.g. `"0.00000015"` = $0.15/1M |
| `data[].links.details` | `"/api/v1/models/{canonical_slug}/endpoints"` | n/a |
| `data[].supported_voices`, `data[].default_parameters`, `data[].per_request_limits` | modality/limits | n/a |

**There is no** throughput, latency, uptime, rank-by-popularity, Elo percentile or "arena rank" in
`/models`. Those live in §2.5 and §1.5 (sort orders) only.

### 1.5 Ordering-as-data: `?sort=`

All four benchmark sorts return **the same 468 objects, reordered, HTTP 200, CORS `*`, same cache
headers** (verified live; sample first item below):

| `sort=` value | First model (2026-10-22) | Verified |
|---|---|---|
| `intelligence-high-to-low` | `anthropic/claude-opus-5.5` (57.6) | HIGH |
| `coding-high-to-low` | `anthropic/claude-fable-5.1` (81.6) | HIGH |
| `agentic-high-to-low` | `anthropic/claude-fable-5.1` (57.9) | HIGH |
| `design-arena-elo-high-to-low` | `anthropic/claude-opus-5.5` | HIGH (works) / **MEDIUM on semantics** |
| `most-popular`, `top-weekly`, `newest`, `context-high-to-low`, `pricing-low-to-high`, `pricing-high-to-low`, `throughput-high-to-low`, `latency-low-to-high` | e.g. `deepseek/deepseek-v4.1-flash` (popular), `relace/relace-apply-3` (throughput) | HIGH |

Spec wording for the enum (verbatim, S14):

> "Sort the returned models server-side. Prefer this over fetching the full list and sorting
> client-side. Options: … **intelligence-high-to-low, coding-high-to-low, agentic-high-to-low
> (Artificial Analysis indices), design-arena-elo-high-to-low (best Design Arena ELO across
> arenas)**. Models without a score for the chosen benchmark are placed last."

**Caveat, verified by computation:** the `design-arena-elo-high-to-low` order is *not* monotonic on
the max ELO across arenas (first values 1476, 1476, 1427, 1470, 1470 …). Of the 27 arena/category
pairs, only `models/codecategories` is monotonic (165 rows) — i.e. the server appears to sort by the
**codecategories ELO**, contradicting "best ELO across arenas". Do not copy this ordering; sort
locally on the metric you display. Confidence: HIGH for the observation, MEDIUM for the explanation.

---

## 2. Other public OpenRouter endpoints carrying scores / rankings / performance

### 2.1 Inventory (anonymous probes unless stated)

| URL | Status | Body shape | Auth | CORS | Cache-Control |
|---|---|---|---|---|---|
| `/api/v1/models` | 200 | `{data[], total_count, links}` | none | `*` | `public, max-age=120, stale-while-revalidate=3600, stale-if-error=3600` |
| `/api/v1/models?sort=<12 values>` | 200 | same, reordered | none | `*` | same |
| `/api/v1/models/count` | 200 | `{"data":{"count":468}}` | none | `*` | n/a |
| `/api/v1/models/count?output_modalities=all` | 200 | `count: 692` | none | `*` | n/a |
| `/api/v1/models/count?output_modalities=image` | 200 | `count: 63` | none | `*` | n/a |
| `/api/v1/models/count?output_modalities=embeddings` | 200 | `count: 39` | none | `*` | n/a |
| `/api/v1/models/user` | 200 | same model list (468, 303 with `benchmarks`) | none (cookie-Bearer optional) | `*` | — |
| `/api/v1/model/{author}/{slug}` | 200 | `{data: <single model incl. benchmarks>}` | none | `*` | — |
| `/api/v1/models/{author}/{slug}/endpoints` | 200 | `{data:{id,name,created,description,architecture,endpoints[]}}` | none | `*` | **`private, no-store`** |
| `/api/v1/benchmarks` | **401** | `{"error":{"message":"No cookie auth credentials found","code":401}}` | **API key** | `*` (preflight 204, `Authorization` allowed) | `private, no-store` |
| `/api/v1/datasets/rankings-daily` | **401** | same 401 shape | API key | `*` (preflight 204) | `private, no-store` |
| `/api/v1/datasets/app-rankings` | **401** | same | API key | `*` | `private, no-store` |
| `/api/v1/datasets/session-cost` | **401** | same | API key | `*` | `private, no-store` |
| `/api/v1/classifications/task` | **401** | same | API key | `*` | docs: `private, max-age=60, stale-while-revalidate=300` |
| `/api/v1/activity` | **401** | same | **management key** | `*` | `private, no-store` |
| `/api/v1/generation?id=` | **401** | same | API key/cookie | `*` | `private, no-store` |
| `/api/v1/key`, `/api/v1/credits` | **401** | same | API key / management key | `*` | `private, no-store` |
| `/api/v1/rankings` | **404** | `{"error":{"message":"Not Found","code":404}}` | — | `*` | — |
| `/api/v1` (root) | **404** | same | — | `*` | — |
| `/api/frontend/models`, `/api/frontend/models/find`, `/api/frontend/stats` | **404** | `{"error":{"message":"Not Found","code":404}}` | — | `https://openrouter.ai` | — |
| `/api/frontend/v1/rankings/{models,tools,images,apps,context-length,market-share,benchmarks,session-cost,open-closed}` | **200** | see §2.6 | none | `*` | `public, max-age=300, stale-while-revalidate=600, stale-if-error=3600` |
| `/api/frontend/v1/rankings/{text,audio,video,programming,languages,tool-calls,cost,fastest}` and `/api/frontend/v1/{models,activity}` | **404** | `{"error":{"message":"Unknown dataset","code":404}}` / `Not Found` | — | `*` | — |
| `/api/frontend/v1/benchmarks` | **401** | `{"error":{"message":"Unauthorized","code":401}}` | cookie | no ACAO | `private, no-store` |

Notable: **`/api/v1/benchmarks`, `/api/v1/activity`, `/api/v1/generation`, `/api/v1/key`,
`/api/v1/credits` are registered routes** — unauthenticated calls return the app-level
`No cookie auth credentials found` 401 rather than 404. A **bogus bearer token** produces a
different error, proving the bearer path is evaluated:

```
GET /api/v1/benchmarks    Authorization: Bearer sk-or-v1-000…000
HTTP 401  {"error":{"message":"User not found.","code":401}}
```

### 2.2 `GET /api/v1/benchmarks` — the unified benchmark endpoint (DOC-ONLY body; 401 live)

Documented at `/docs/api/api-reference/benchmarks/list-benchmarks` and
`/docs/cookbook/administration/data-api#benchmarks` (S5, S6, S14).

Verbatim doc text:

> "Unified benchmark endpoint that aggregates scores from multiple benchmark sources (Artificial
> Analysis, Design Arena, and OpenRouter's own tau-bench, GPQA, and web-search evals). … Authenticate
> with any valid OpenRouter API key. **Rate-limited to 30 requests/minute per key and 500
> requests/day per account.**"

Query parameters (exact, from spec):

| Param | Values | Applies to |
|---|---|---|
| `source` | `artificial-analysis` \| `design-arena` \| `openrouter` | all; omitted ⇒ all sources |
| `task_type` | `coding` \| `intelligence` \| `agentic` \| `search` | cross-source filter (DA maps coding→`codecategories`; `search` ⇒ OpenRouter search only) |
| `benchmark_type` | `gpqa_diamond` \| `tau_bench_verified_airline` \| `search_browsecomp` \| `search_hle` \| `search_dsqa` \| `search_widesearch` | OpenRouter items |
| `arena` | `models` \| `builders` \| `agents` (default `models`) | Design Arena |
| `category` | e.g. `codecategories, uicomponent, gamedev, 3d, dataviz, image, video, svg` | Design Arena |
| `search_engine` | e.g. `exa` | OpenRouter search |
| `search_surface` | `server-tool` \| `plugin` | OpenRouter search |
| `include_run_config` | bool, default `false` | OpenRouter search |
| `max_results` | int ≥ 1 (docs: 1–100) | all |

Response envelope: `{data: [...], meta: {as_of, citation, model_count, source, source_url,
task_type, version: "v1"}}` (all meta keys required; `citation` may be `null` when multiple
sources are mixed — "attribute each item individually by its `source` discriminator").

**Item shape A — `source: "artificial-analysis"`** (schema `UnifiedBenchmarksAAItem`):
`{source, model_permaslug, display_name, intelligence_index | null, coding_index | null,
agentic_index | null, pricing:{prompt, completion}}`; all three indices **required keys**,
nullable, **0–100**.

**Item shape B — `source: "design-arena"`** (`UnifiedBenchmarksDAItem`):
`{source, model_permaslug, display_name, arena, category, elo (number), win_rate (0–100),
avg_generation_time_ms | null, tournament_stats:{first_place, second_place, third_place,
fourth_place, total} (ints|null), pricing}`. Docs call category "e.g. codecategories, uicomponent,
gamedev, 3d, dataviz, image, video, svg".

**Item shape C — `source: "openrouter"`, classic** (`UnifiedBenchmarksORItem`):
`{source, model_permaslug, display_name, benchmark_type: gpqa_diamond|tau_bench_verified_airline,
accuracy (0–1), accuracy_stddev, avg_cost_per_task (USD), total_tasks, last_run_timestamp}`.

**Item shape D — `source: "openrouter"`, search** (`UnifiedBenchmarksSearchItem`):
`{… benchmark_type: search_*, primary_metric: "accuracy"|"f1_by_item", primary_score (0–1),
total_tasks, avg_cost_per_task, avg_latency_per_task_ms, search_engine, search_surface,
run_config?:{max_agent_turns, reasoning_effort, temperature}, last_run_timestamp}`.

Canonical citations returned in `meta.citation` (verbatim examples):
- `Source: Artificial Analysis (artificialanalysis.ai) via OpenRouter (openrouter.ai/rankings).`
- `Source: Design Arena (www.designarena.ai) via OpenRouter (openrouter.ai/rankings).`
- `Source: OpenRouter evals (openrouter.ai) via OpenRouter (openrouter.ai/rankings).`

### 2.3 `GET /api/v1/datasets/*` (usage rankings — CC BY 4.0)

Documented, key-gated, 30 rpm / 500 per day per account, `meta.version: "v1"` (S6, S14):

| Endpoint | Key fields |
|---|---|
| `/api/v1/datasets/rankings-daily?start_date=&end_date=` | `data[].{date, model_permaslug, total_tokens **string**}`; max 51 rows/day (top 50 + aggregated `other`); window ≤ 366 days; dataset starts `2025-01-01` |
| `/api/v1/datasets/app-rankings?sort=popular|trending&category=&subcategory=&limit=1-100&offset=0-100` | `data[].{rank, app_id, app_name, total_tokens string, total_requests}` |
| `/api/v1/datasets/session-cost?app_slug=&model=&turn_range=&limit=&offset=` | `data[].{app_name, app_slug, median_session_cost_usd, model_permaslug, turn_range}`; `meta.{window_days, window_end_date}` |
| `/api/v1/classifications/task?window=7d` | `data.classifications[].{tag, display_name, macro_category, usage_share 0–1, token_share 0–1, category_usage_share, category_token_share, models[]:{id, tag_usage_share, tag_token_share}}`; `data.macro_categories[]`; `data.as_of` |

None of these carry *quality* scores — they are popularity/volume (useful as a "market share" or
"trending" signal, and `/classifications/task` gives per-task-classification top models).

### 2.4 Sorts verified as *working* but returning no new data

`throughput-high-to-low` and `latency-low-to-high` respond 200 and reorder 468 models, yet the
underlying numbers are **not present** in `/models` — so these are black-box orderings with no
explainable value. Confidence HIGH (payload has no perf fields).

### 2.5 `GET /api/v1/models/{author}/{slug}/endpoints` — performance & reliability

Live, anonymous, HTTP 200, CORS `*`, **`Cache-Control: private, no-store`**.
`deepseek/deepseek-v4.1-flash-1017` returned 30 endpoints; every endpoint object had exactly these
25 keys:

```
name, model_id, model_name, context_length, pricing{prompt,completion,input_cache_read,discount},
provider_name, tag, service_tier, quantization, max_completion_tokens, max_prompt_tokens,
supported_parameters[], supports_tool_choice{none,auto,required,function}, status,
uptime_last_30m, uptime_last_5m, uptime_last_1d, supports_implicit_caching, native_tools{},
supports_voice_cloning, supports_multiple_audio_references, supports_image_reference,
supports_diarization, latency_last_30m, throughput_last_30m
```

Live values: `quantization` = e.g. `"fp4"`, `"fp16"`, `"unknown"`; `uptime_last_1d` =
`98.95324494068389` (**percent 0–100, unrounded float**); `uptime_last_30m`/`_5m` = `100` or `null`;
`status` = `0` on healthy endpoints (semantics of non-zero **UNKNOWN**).
**`latency_last_30m` and `throughput_last_30m` were `null` on every endpoint probed** (30 endpoints
of deepseek-v4.1-flash, 6+ of `openai/gpt-5.6` and `anthropic/claude-opus-5.5`).

Spec (S14) says these are **percentile objects**, not numbers:

```yaml
latency_last_30m:    {p50: 0.25, p75: 0.35, p90: 0.48, p99: 0.85}   # seconds in the example
throughput_last_30m: {p50: 45.2, p75: 38.5, p90: 28.3, p99: 15.1}   # tokens/s
perf_last_30m_by_workload:                                           # NEW field
  text_generation: {latency:{p50:250,p75:350,p90:480,p99:850},
                    throughput:{p50:45.2,...}, request_count:1000}
```

and states verbatim for `perf_last_30m_by_workload`:

> "Endpoint performance over the last 30 minutes, keyed by the kind of request served (e.g.
> `text_generation`, `image_generation`). Additive to the legacy singular latency and throughput
> fields; image and video generation report end-to-end latency. **Only visible when authenticated
> with an API key or cookie.**"

⇒ Anonymous response has `perf_last_30m_by_workload` **absent** and the legacy percentiles `null`.
Confidence HIGH that they are auth-gated; the exact authenticated values are **UNKNOWN here**.
Also note `latency_last_30m` unit: spec example is in **seconds** (0.25) while `perf_last_30m_by_workload.latency` is in **milliseconds** (250) — divergent units, flag it in code comments.

Also present: `/api/v1/images/models/{author}/{slug}/endpoints` and `/api/v1/videos/*` for media.

### 2.6 `openrouter.ai/api/frontend/v1/rankings/*` — what the website uses (undocumented)

These are **not** in the OpenAPI spec and carry no compatibility promise, but they are public, CORS
`*`, cached `public, max-age=300, stale-while-revalidate=600`, and are exactly the datasets behind
openrouter.ai/rankings (S8 probing).

| Dataset | Size | Shape |
|---|---|---|
| `benchmarks` | 508 KB | `{data:{aaData, daData, valsIndex, weightedInputPrices, costPerRequest}}` |
| `models` | 438 KB | `data[]` rows: `date, model_permaslug, variant, total_completion_tokens, total_prompt_tokens, total_native_tokens_reasoning, count, num_media_prompt/completion, image_output_requests, num_video_prompt, video_output_seconds, rerank_documents, stt_transcript_characters, num_audio_prompt, total_native_tokens_cached, total_tool_calls, requests_with_tool_call_errors, total_byok_prompt_tokens, total_byok_completion_tokens, variant_permaslug, change, rankingMetricValue` (656 rows = 6 days × ~110 models) |
| `tools`, `images`, `context-length`, `market-share`, `open-closed` | 5–13 KB | time series `data[].{x: "YYYY-MM-DD", ys: {slug: number}}` |
| `apps` | 28 KB | `data.{day[],month[],…}` with `{app_id, total_tokens, total_requests, rank, app{…}}` |
| `session-cost` | — | `{data:{windowDays, windowEnd, harnesses[]}}` |

`benchmarks` internals (all verified live):

```
data.aaData.intelligence[]        351 rows  {uid, permaslug, openrouter_slug|null,
                                             heuristic_openrouter_slug, aa_name,
                                             score}
data.aaData.coding[]              152 rows  same shape
data.aaData.agentic[]             108 rows  same shape
data.aaData.percentilesBySlug{}   464 keys  {intelligence: 0-100, coding: 0-100, agentic: 0-100}
data.daData["{arena}-{category}"] 29 keys   rows {da_model_id, permaslug, openrouter_id,
                                             display_name, score (=ELO), win_rate,
                                             avg_generation_time_ms}
data.valsIndex                    {benchmark_version: 2.2, models: [{permaslug,
                                    vals_model_label, score}] (22 rows)}
data.weightedInputPrices{}        {permaslug: USD per 1M input}   (e.g. 0.21138)
data.costPerRequest{}             {permaslug: USD per typical request} (e.g. 5.0484)
```

`daData` keys (29): `models-{gamedev,website,3d,codecategories,dataviz,svg,uicomponent,asciiart,
audiorealism,graphicdesign,image,logo,imageediting,text-to-speech}`,
`agents-{agenticgamedev,agentichtmlslides,agenticslides(html),androidnative,fullstack,godotgamedev,
htmlslides,mobileapps,python-pptxslides,webapps,spreadsheet,agenticslides,agenticslides(python-pptx),
pptxslides,blender3d}`.

Why it matters: this is the **only anonymous, zero-key source of AA scores + AA percentiles +
Design Arena per-category data + OpenRouter "vals" eval index** in one call. Why to be careful:
undocumented, 508 KB, `daData` shape is keyed by strings that will move, and `openrouter_slug` is
`null` for every row (join via `heuristic_openrouter_slug` / `permaslug`).

Also note `/api/frontend/v1/benchmarks` (401, cookie-only) exists — the site's own benchmark API
under a different path — do not confuse it with `/api/v1/benchmarks`.

### 2.7 Not present

- `/api/v1/rankings` → **404**. No `/api/v1/benchmarks/{source}` legacy paths documented as live
  (the unified endpoint's `source` filter "reproduce[s] the exact shapes from the legacy per-source
  endpoints" — legacy URLs **UNKNOWN**).
- `/api/frontend/models`, `/api/frontend/stats`, `/api/frontend/v1/models`, `/api/frontend/v1/activity` → **404**.
- No `s-maxage` anywhere observed; no `ETag`.

---

## 3. Can a user's own API key reveal per-model performance *for that user*?

Short answer: **partially — yes for your own traffic/costs; no for OpenRouter-wide medians unless the
key is a management key, and never for other users.** No key was available here, so all bodies below
are from the spec/docs (**DOC-ONLY**) except where stated.

### 3.1 `GET /api/v1/generation?id=gen-…` (per-request record)

- Live anonymous: **401** `No cookie auth credentials found`. Auth: API key (bearer) or cookie (S14).
- Fields (S14, `GenerationResponse.data`): `id, model, provider_name, created_at, latency (ms),
  generation_time (ms), moderation_latency (ms), tokens_prompt, tokens_completion, native_tokens_*,
  num_media_prompt/completion, num_search_results, total_cost, usage, upstream_inference_cost,
  cache_discount, is_byok, cancelled, finish_reason, native_finish_reason, streamed, service_tier,
  data_region, app_id, external_user, http_referer, origin, user_agent, router, upstream_id,
  request_id, preset_id, workspace_id, api_type, provider_responses` (all required except a few).
- **There is no `tokens_per_second`/throughput field** — derive it as
  `tokens_completion / (generation_time/1000)`. Confidence HIGH (spec field list).
- `X-Generation-Id`: the header is officially exposed to browsers —
  `access-control-expose-headers: X-Generation-Id,X-Provider-Name,request-id,cf-ray` on every
  `/api/v1/*` response (live, HIGH). Its documentation page was not located; **DOC-ONLY/partial**.
- `/api/v1/generation/content` (stored prompt/completion) and `/generation/feedback` also exist (S14).

### 3.2 `usage.cost` and `usage.completion_tokens_details`

In the **chat/completions response** (S14, `ChatUsage`):

```json
"usage": {
  "prompt_tokens": 10, "completion_tokens": 15, "total_tokens": 25,
  "cost": 0.0012, "is_byok": false,
  "completion_tokens_details": {"reasoning_tokens": 5, "audio_tokens": null,
                                "accepted_prediction_tokens": null,
                                "rejected_prediction_tokens": null},
  "prompt_tokens_details": {"cached_tokens": 2},
  "cost_details": {"upstream_inference_prompt_cost": 0.0008,
                   "upstream_inference_completions_cost": 0.0004,
                   "upstream_inference_cost": null},
  "server_tool_use_details": {"tool_calls_requested": 2, "tool_calls_executed": 2}
}
```

`cost` is **USD for that request** and is the documented way to attribute spend. It is **not** a
benchmark and gives no cross-model quality signal.

### 3.3 Per-model aggregation for an account

| Capability | Endpoint | Key type | Fields |
|---|---|---|---|
| Tokens/cost/requests per **date × model × endpoint** (30 days) | `GET /api/v1/activity?date=&api_key_hash=&user_id=&workspace_id=&group_by=workspace` | **management key** | `byok_usage_inference, cached_tokens, completion_tokens, prompt_tokens, reasoning_tokens, requests, usage, model, model_permaslug, provider_name, endpoint_id, date` |
| Arbitrary analytics (dimensions, granularities minute→month, metric formats incl. `latency` and `throughput`) | `GET /api/v1/analytics/meta`, `POST /api/v1/analytics/query` | **management key** | `metrics[] {name, display_label, is_rate, display_format ∈ number|currency|percent|latency|throughput}`, `dimensions[]`, `operators`, `granularities` |
| Credits/budget | `/api/v1/key`, `/api/v1/credits` | key / management key | `usage, usage_daily/weekly/monthly, byok_usage*, limit_remaining, budgets[], effective_budget, free_model_daily_requests{used,limit,remaining}` |
| Per-model **latency/throughput percentiles** | `/api/v1/models/{author}/{slug}/endpoints` → `perf_last_30m_by_workload` | any API key or cookie | see §2.5 |

**What is NOT possible:** (a) a per-user *benchmark/quality* score — benchmarks are global; (b) any
other user's or the aggregate platform's per-model latency/throughput via a normal inference key;
(c) guaranteed SLA-style percentiles without a key at all (anonymous sees `null`). Exact metric names
available to `/analytics/query` are **UNKNOWN** without an account.

---

## 4. Rate limits and caching etiquette

### 4.1 Documented rate limits

| Surface | Limit | Source |
|---|---|---|
| `/api/v1/benchmarks` | **30 requests/minute per key, 500 requests/day per account** | S5, S6, S14 (three independent wordings) |
| `/api/v1/datasets/*`, `/api/v1/classifications/task` | same: 30 rpm/key, 500/day/account | S6, S7 |
| Free model variants (`:free`) | table with credits-purchased tiers — **numbers not extractable** (client-rendered); per-minute limit explicitly "not reported" in `/api/v1/key` | S9 (**numbers UNKNOWN**) |
| Paid models | no platform-level request cap; only credit/budget limits + Cloudflare DDoS protection | S9 |
| `/api/v1/models`, `/models/count`, `/endpoints`, `/model/{...}` | **no documented numeric cap**; governed by Cloudflare DDoS protection | S9 (implicit) |

`X-RateLimit-Limit/Remaining/Reset` appear **only on 429 responses**; successful responses never
include them (verbatim, S9). 429 body:
`{"error":{"code":429,"message":"Rate limit exceeded","metadata":{"error_type":"rate_limit_exceeded"}}}`.

### 4.2 Caching

| Endpoint | Cache-Control (live) | Safe to use a shared cache? |
|---|---|---|
| `/api/v1/models` | `public, max-age=120, stale-while-revalidate=3600, stale-if-error=3600` | **Yes** (explicitly `public`); note `Vary: Host, User-Agent, Originator, Anthropic-Version` — forward those headers or key your cache on them |
| `/api/frontend/v1/rankings/*` | `public, max-age=300, stale-while-revalidate=600, stale-if-error=3600` | Yes |
| `/api/v1/models/{a}/{s}/endpoints` | `private, no-store` | **No** — must not be stored in a shared cache; cache in your own KV only per-request/with your own TTL |
| `/api/v1/benchmarks`, `/datasets/*`, `/key`, `/generation`, `/activity` | `private, no-store` | **No** (and they are per-account anyway) |
| `/api/v1/classifications/task` | `private, max-age=60, stale-while-revalidate=300` (documented) | No (private) |

**ETag / If-None-Match: not supported** — `/api/v1/models` sends no `ETag`, no `Last-Modified`, and a
request with a bogus `If-None-Match` returns `200` (not `304`). There is no `s-maxage`; only
`max-age`. Practical etiquette: call `/models` at most every 2 minutes (matching `max-age=120`),
respect `Age`, and treat `429` with exponential backoff + `Retry-After`.

---

## 5. Licensing / attribution when displaying this in a public web app

### 5.1 Rankings / Data API — **CC BY 4.0** (explicit, quotable)

Rankings page (openrouter.ai/rankings), verbatim:

> "Rankings data by OpenRouter is licensed under CC BY 4.0. Reuse and republish it with attribution.
> The Data API docs cover the citation format and JSON access to these datasets."

Data API cookbook, verbatim:

> "Data returned by the Data API is licensed under Creative Commons Attribution 4.0 International
> (CC BY 4.0). You may copy, redistribute, and build on it, including commercially, with attribution
> to OpenRouter.
> The license covers the aggregated data these endpoints return. It does not cover per-user data,
> per-customer volumes, or anything not published through these endpoints."

> "Attribution satisfies CC BY 4.0 when you carry the citation line the endpoint specifies.
> `rankings-daily` and `app-rankings` each name one in their description, in this form:
> `Source: OpenRouter (openrouter.ai/rankings), as of <meta.as_of>.`
> … Add `Licensed under CC BY 4.0.` to the citation when you republish the data itself rather than
> quoting a figure from it."

> "Figures may be restated as snapshots refresh, so record the `meta` block alongside any number you
> publish."

> "The dataset is intended for analysis, reporting, and visualisation. It is not intended to be
> re-served as a competing free API." (rankings-daily acceptable-use note)

Datasets SDK README, verbatim:

> "Public OpenRouter usage datasets. Data returned by these endpoints is licensed under CC BY 4.0
> (https://creativecommons.org/licenses/by/4.0/): reuse and republish it, including commercially,
> with attribution to OpenRouter."

`/api/v1/datasets/session-cost` description, verbatim: "Licensed under CC BY 4.0: reuse and
republish with attribution to OpenRouter."

**Confidence HIGH** for all quotes (three independent pages).

### 5.2 Benchmarks endpoint — per-source attribution is machine-readable

`meta.citation` is a **required field** of `/api/v1/benchmarks` and carries the exact string to show
(§2.2). It is `null` only when you mix sources, in which case attribute per item via `source`. The
upstream sources are Artificial Analysis (artificialanalysis.ai) and Design Arena
(www.designarena.ai), plus OpenRouter's own evals — so a compliant UI needs three attribution lines
when it shows all three, not just "OpenRouter".

### 5.3 `/api/v1/models` catalogue — **no explicit data licence found**

- `/api/v1/models` responses contain no licence/attribution field.
- The models OpenAPI page and `llms.txt` index contain **no licence statement** for the catalogue.
- `openrouter.ai/terms` (checked, 200) licenses *your* User Content **to** OpenRouter; it says nothing
  that grants you a licence **to** the catalogue or the benchmark fields.
- The Models/ModelBenchmarks docs (S13, S14) describe `benchmarks` as "Third-party benchmark rankings
  for this model" — i.e. third-party data redistributed by OpenRouter.

Therefore: **catalogue licence = UNKNOWN / no explicit grant.** Practical position: the catalogue is
factual data (model names, prices, context length, indices) and is universally republished, but if you
redistribute the embedded `benchmarks` object you are redistributing AA/Design Arena data — attribute
`Artificial Analysis` and `Design Arena` explicitly, and carry the OpenRouter attribution for the
rankings dataset when you show §2.3/§2.6 numbers. Do not present CC BY 4.0 as covering the catalogue
(§5.1 explicitly scopes the licence to the *aggregated data the endpoints return*).

### 5.4 Undocumented frontend endpoints

`/api/frontend/v1/rankings/*` has no published licence text. Its content mirrors `/rankings`
(CC BY 4.0 per §5.1), but the endpoint itself is undocumented — treat as **no contract**: cache
aggressively, fail closed to `/models`, and keep attribution identical to the rankings page.

---

## 6. Ground truth snapshots (for regression tests)

```
GET /api/v1/models → 200, 468 items, total_count 468, links.next null
  benchmarks present: 303 ; artificial_analysis: 286 ; design_arena non-empty: 180
  AA non-null: intelligence 286 / coding 164 / agentic 126
  AA ranges: 3.8–57.6 / 2.7–81.6 / 0.1–57.9      design_arena rows: 1712 (arena models 1195, agents 517)
  ELO 750–1476 ; win_rate 18.9–75 ; rank 1–146
GET /api/v1/models/count → {"data":{"count":468}} ; ?output_modalities=all → 692 ; =image → 63 ; =embeddings → 39
GET /api/v1/models/deepseek/deepseek-v4.1-flash-1017/endpoints → 200, 30 endpoints, quantization "fp4",
  uptime_last_1d 98.95324494068389, latency_last_30m null, throughput_last_30m null, status 0
GET /api/v1/model/deepseek/deepseek-v4.1-flash-1017 → 200, data.benchmarks.design_arena 8 rows
GET /api/v1/benchmarks (anon) → 401 "No cookie auth credentials found"
GET /api/v1/benchmarks (bogus bearer) → 401 "User not found."
GET /api/v1/rankings → 404
GET /api/frontend/v1/rankings/benchmarks → 200, aaData.intelligence 351 rows, percentilesBySlug 464,
  daData 29 keys, valsIndex.benchmark_version 2.2
```

---

## 7. Gaps and UNKNOWNs (do not invent these)

1. **Authenticated bodies of `/api/v1/benchmarks`, `/datasets/*`, `/activity`, `/analytics/*`,
   `/generation`** were not obtained — no API key in this environment (`.env` has
   `OPENROUTER_API_KEY` commented out; no `OPENROUTER_API_KEY` in the process env). All their
   schemas above come from the published OpenAPI spec/examples (**DOC-ONLY**, high-quality but
   unverified against live data).
2. **Free-model rate-limit numbers** (req/min, req/day, credits threshold) are rendered client-side
   and were not extractable; the docs only say the daily ceiling is reported in
   `free_model_daily_requests`. **UNKNOWN.**
3. **`status` enum** on endpoints (0 = healthy observed) — meaning of non-zero values UNKNOWN.
4. **Legacy per-source benchmark endpoint URLs** (pre-unification) — UNKNOWN; use `source=`.
5. **`latency_last_30m` unit** (seconds per spec example vs ms for `perf_last_30m_by_workload`) —
   treat as UNKNOWN at runtime; detect (values <5 ⇒ likely seconds).
6. **Which datasets power the "Fastest models / Languages / Programming / Domain / Tool Calls"
   rankings tabs** — those dataset names 404; their route/params are UNKNOWN (likely separate
   endpoints under `/api/frontend/v1/rankings/*` we did not guess).
7. **Exact metric names in `/analytics/query`** — UNKNOWN without a management key.
8. Tavily deep-research search was attempted as mandated but the key pool was exhausted
   (exit ≠ 0) after the kickoff; all findings were therefore produced with direct HTTP probes,
   the published OpenAPI spec, and the docs pages — which is stronger evidence than search anyway.
9. `/api/v1/models` has **no ETag**; any invented "If-None-Match works" claim is false.

---

## 8. What the app should fetch, verbatim

### Tier 1 — no auth, already allowed by CORS, cache ~2 min (do this first)

```http
GET https://openrouter.ai/api/v1/models
  → 200 · 787 KB · Access-Control-Allow-Origin: * · Cache-Control: public, max-age=120
  AA:        data[].benchmarks.artificial_analysis.{intelligence_index,coding_index,agentic_index}   [0–100, nullable]
  DA:        data[].benchmarks.design_arena[].{arena,category,elo,win_rate,rank}                     [elo 750–1476, win_rate 0–100, rank 1..146]
  guard:     `benchmarks` absent on ~35% of rows; `design_arena` may be [].
```

```http
GET https://openrouter.ai/api/v1/model/{author}/{slug}          # single model, same benchmarks object
GET https://openrouter.ai/api/v1/models/{author}/{slug}/endpoints
  → 200 · Cache-Control: private, no-store
  data.endpoints[].uptime_last_5m | uptime_last_30m | uptime_last_1d   [percent 0–100, may be null]
  data.endpoints[].quantization                                       ["fp4"|"fp16"|"unknown"|...]
  data.endpoints[].latency_last_30m | throughput_last_30m             [null anonymously → hide the column]
```

### Tier 2 — API key (server-side proxy only; never ship the key to the browser)

```http
GET https://openrouter.ai/api/v1/benchmarks?source=artificial-analysis&max_results=100
  → data[].{model_permaslug, display_name, intelligence_index, coding_index, agentic_index, pricing{prompt,completion}}
    scale 0–100 · meta.{as_of, citation, source_url:"https://artificialanalysis.ai"}

GET https://openrouter.ai/api/v1/benchmarks?source=design-arena&arena=models&max_results=100
  → data[].{model_permaslug, display_name, arena, category, elo, win_rate, avg_generation_time_ms,
            tournament_stats{first_place,second_place,third_place,fourth_place,total}, pricing}
    win_rate 0–100 · meta.citation = "Source: Design Arena (www.designarena.ai) via OpenRouter (openrouter.ai/rankings)."

GET https://openrouter.ai/api/v1/benchmarks?source=openrouter&max_results=100
  → data[].{benchmark_type ∈ gpqa_diamond|tau_bench_verified_airline|search_browsecomp|search_hle|search_dsqa|search_widesearch,
            accuracy 0–1 | primary_score 0–1 + primary_metric, accuracy_stddev, avg_cost_per_task,
            avg_latency_per_task_ms, total_tasks, search_engine, search_surface, last_run_timestamp}

GET https://openrouter.ai/api/v1/datasets/rankings-daily?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
  → data[].{date, model_permaslug, total_tokens:string} · meta.{as_of, version, start_date, end_date}
GET https://openrouter.ai/api/v1/datasets/app-rankings?sort=popular&limit=50
GET https://openrouter.ai/api/v1/datasets/session-cost?limit=100
GET https://openrouter.ai/api/v1/classifications/task?window=7d
  → data.classifications[].{tag, usage_share 0–1, models[]:{id, tag_usage_share, tag_token_share}}

# Budget: these four share 30 req/min per key and 500 req/day per account.
```

Fail-safe: if any Tier-2 call returns 401/403/429, fall back to Tier 1 values only and label the source.

### Tier 3 — optional, undocumented (feature-flag it)

```http
GET https://openrouter.ai/api/frontend/v1/rankings/benchmarks
  → 200 · 508 KB · ACAO * · Cache-Control: public, max-age=300
  data.aaData.intelligence[][] .coding[] .agentic[]      → {uid, permaslug, openrouter_slug|null,
                                                             heuristic_openrouter_slug, aa_name, score}
  data.aaData.percentilesBySlug{permaslug}               → {intelligence, coding, agentic}   [0–100]
  data.daData["models-website"][]                        → {da_model_id, permaslug, openrouter_id,
                                                             display_name, score(ELO), win_rate,
                                                             avg_generation_time_ms}
  data.valsIndex                                         → {benchmark_version, models[{permaslug, vals_model_label, score}]}
  data.weightedInputPrices{permaslug}                    → USD per 1M input
  data.costPerRequest{permaslug}                         → USD per typical request
```

### Attribution block to render (exact lines)

```text
Benchmarks: Artificial Analysis (artificialanalysis.ai) via OpenRouter (openrouter.ai/rankings); 
            Design Arena (www.designarena.ai) via OpenRouter (openrouter.ai/rankings);
            OpenRouter evals (openrouter.ai) via OpenRouter (openrouter.ai/rankings).
Rankings data: Source: OpenRouter (openrouter.ai/rankings), as of <meta.as_of>. Licensed under CC BY 4.0.
```

(Use `meta.citation` verbatim when a single `source` is requested; the three lines above are the
union for a mixed view. `as_of` must be stored with the number, per §5.1.)

---

## Sources

- **[S1]** `GET https://openrouter.ai/api/v1/models` — live 200, headers, 787 505-byte body (2026-10-22).
- **[S2]** Derived statistics over S1 body (468 models; 303/286/180 coverage; AA ranges; 1712 arena rows; 27 categories).
- **[S3]** `GET https://openrouter.ai/api/v1/models?sort=…` for 10 sort values — live 200 + returned orderings.
- **[S4]** `GET https://openrouter.ai/api/v1/models/count` (+`output_modalities` filters) — live 200.
- **[S5]** https://openrouter.ai/docs/api/api-reference/benchmarks/list-benchmarks — unified `/benchmarks` spec text, limits, item shapes, citations.
- **[S6]** https://openrouter.ai/docs/cookbook/administration/data-api — Data API: licence/citation, datasets, benchmarks, task classifications, 30 rpm/500 per day.
- **[S7]** https://openrouter.ai/docs/client-sdks/typescript/sdks/datasets/README.md — "licensed under CC BY 4.0" wording.
- **[S8]** `GET https://openrouter.ai/api/frontend/v1/rankings/{benchmarks,models,tools,images,apps,context-length,market-share,session-cost,open-closed}` — live 200 + shapes; 404s for other dataset names.
- **[S9]** https://openrouter.ai/docs/api_reference/limits — credit/budget/rate-limit taxonomy, `X-RateLimit-*` on 429 only, free-tier table (values client-rendered).
- **[S10]** https://openrouter.ai/rankings — CC BY 4.0 attribution sentence (verbatim), 2.5 MB SSR page.
- **[S11]** https://openrouter.ai/api/v1/models/deepseek/deepseek-v4.1-flash-1017/endpoints — live 200, 30 endpoints, null perf fields, `private, no-store`.
- **[S12]** `GET https://openrouter.ai/api/v1/model/deepseek/deepseek-v4.1-flash-1017` — live 200 with `data.benchmarks`.
- **[S13]** https://openrouter.ai/docs/client-sdks/typescript/models/modelbenchmarks — "Third-party benchmark rankings … Omitted when no benchmark data is available".
- **[S14]** https://openrouter.ai/docs/openapi/openapi.yaml — full OpenAPI 3.x spec (2 061 272 bytes): `/models` sort enum, `Model`, `ModelBenchmarks`, `AABenchmarkEntry`, `DABenchmarkEntry`, `PublicEndpoint` (incl. `perf_last_30m_by_workload`, "Only visible when authenticated"), `UnifiedBenchmarks*`, `/activity`, `/analytics/{meta,query}`, `/datasets/*`, `/generation`, `ChatUsage`, `/credits`.
- **[S15]** `GET https://openrouter.ai/api/v1/benchmarks` anon 401 `No cookie auth credentials found` vs bogus-bearer 401 `User not found.` — proves key-gated bearer path.
- **[S16]** https://openrouter.ai/terms — no data/catalogue licence grant (checked for §5.3).
- **[S17]** https://openrouter.ai/docs/llms.txt — documentation index; Datasets/Benchmarks/Classifications SDK pages; OpenAPI spec location.
- **[S18]** CORS preflight `OPTIONS` on `/api/v1/benchmarks`, `/api/v1/datasets/rankings-daily`, `/api/frontend/v1/rankings/benchmarks` — 204, `Access-Control-Allow-Origin: *`, `Authorization` in `allow-headers`.
