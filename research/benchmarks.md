# The 2026 LLM benchmark landscape — what a selector dashboard can actually ingest

**Status:** research dossier · **Compiled:** 2026-10-22 · **Project:** SOM — LLM Selector
**Scope:** benchmark/leaderboard inventory, machine-readable access, CORS/proxy viability, a default scoring axis set, and honest-uncertainty practice.
**Method:** Tavily deep-research protocol (`search --deep-research`, then atomic sub-questions, primary-source extraction, gap audit). Facts are pinned to sources `[S#]` listed in §9 with a source level (A–D) and confidence. Numbers that could not be verified are written as **UNKNOWN** — none are estimated.

---

## 0. How to read this (confidence scale)

| Level | Meaning | Use in a dashboard |
| --- | --- | --- |
| **A** | Primary documentation, the benchmark's own repo/API, or a measurement I ran myself on 2026-10-22 (HTTP probe) | Can be stated as fact; safe to encode in code |
| **B** | Independent evaluation org with published methodology (e.g. Vals AI), official project account | Fact, but re-check before hard-coding |
| **C** | Practitioner blog, aggregator, or leaderboard mirror | Direction only; never a number source |
| **D** | Forum/anecdote/SEO | Illustrative only |

**The single most important structural finding:** in October 2026 the benchmarks most people still name — MMLU-Pro, GPQA Diamond, AIME 2025, MATH-500, LiveCodeBench, τ²-Bench Telecom, Terminal-Bench 2.1 — are all listed by Artificial Analysis as **legacy evaluations that were removed in Intelligence Index v4.0 and are no longer actively reported** [S3]. A dashboard built on the 2024–2025 benchmark canon would be showing a retired instrument panel. The 2026 canon is different: AA-Briefcase, GDPval-AA, AutomationBench-AA, Terminal-Bench 4.0, SciCode, AA-Omniscience, GDP.pdf, AA-LCR, HLE, CritPt [S3].

---

## 1. Executive answer

1. **There is no free, CORS-enabled, official API for the two headline sources people expect** — Artificial Analysis (keyed, 401 without `x-api-key`, docs forbid client-side keys) [S4][S5] and LMArena/Arena (Cloudflare 403 to non-browser clients) [S8]. Two harder facts sit behind that: **AA's `/api/v2/data/*` endpoints return `410 Gone` after 2026-11-04**, replaced by `/api/v2/language/models/free` (headline indices only) and `/api/v2/language/models` (Pro tier, per-benchmark scores) [S45][S47]; and AA's Pro Data Platform Terms prohibit precisely what a public selector does — embedding the data in a dashboard (§2.4(c)), combining it with third-party sources into a product (§2.4(d)), or providing "**model/provider selection guidance**" (§2.5, §1.9 "Competitive Product") — without prior written consent [S46]. **That is a launch gate, not a footnote** (§3.1.1).
2. **The three genuinely free, CORS-friendly, no-key sources are OpenRouter's catalog, the Hugging Face dataset APIs, and `raw.githubusercontent.com`** — verified by probe: `access-control-allow-origin: *` (OpenRouter, raw.githubusercontent) or origin-echo (HF) [S9][S10][S11]. That trio covers pricing/context/modality, Arena Elo history, and SWE-bench's official results JSON [S18].
3. **Epoch AI's Benchmarking Hub is the best single aggregator for a dashboard**: 85 benchmarks × 391 models, CC-BY-4.0, downloadable as CSV ZIP, plus a Python client [S15][S16] — but `epoch.ai` sends **no** `Access-Control-Allow-Origin`, so it is build-time/ingest-side only [S17].
4. **Saturation is now the default state, not the exception.** Vals AI has formally *archived* SWE-bench Verified, GPQA Diamond, LiveCodeBench and Terminal-Bench 2.0 with the note "since performance on this benchmark has saturated, we no longer run this benchmark on new model releases" [S19][S20][S21][S22]. Any composite that still weights those benchmarks is ranking models on noise.
5. **Harness dependence is the second-order error term, and it is bigger than most model deltas.** ARC Prize's own reporting shows Gemini 4 Argon at **97.5%** on ARC-AGI-3 with a provider-adapter harness versus **49.8%** with the standard harness [S27]; practitioners report a 10–20 pp SWE-bench swing from scaffolding alone [S33]. A comparison UI that does not display the harness is lying by omission.

---

## 2. The 2026 benchmark map (master table)

Status legend: **ACTIVE** = currently run and reported · **LEGACY** = retired by its main publisher but data still published · **ARCHIVED/SAT** = formally discontinued because saturated · **CROWD** = human-vote signal.

| Benchmark / index | Measures | Scale (items) | Canonical source | Machine-readable? | 2026 status | Src |
| --- | --- | --- | --- | --- | --- | --- |
| **AA Intelligence Index v4.3.2** | Composite of 10 evals, 4 categories | 10 evals | artificialanalysis.ai/methodology/intelligence-benchmarking | Yes — `GET /api/v2/language/models[/free]`, keyed | ACTIVE | [S3][S47] |
| **AA Coding Agent Index** | End-to-end coding-agent perf. across agents/models/settings | UNKNOWN (agent runs) | artificialanalysis.ai/agents/coding-agents | Via AA API (UNKNOWN coverage) | ACTIVE | [S1] |
| **AA Coding / Agentic / Math index fields** | Pre-computed category subsets of the composite | — | `artificial_analysis_coding_index`, `…_agentic_index` exist in the API contract; `…_math_index` is **absent** from it | Via AA API | coding/agentic ACTIVE (unversioned); **math LEGACY** | [S1][S47] |
| **AA Agents category** (AA-Briefcase v1.1, GDPval-AA v2.1, AutomationBench-AA) | Knowledge-work agency: multi-week projects, SaaS automation | 91 tasks / 220 tasks / 657 tasks | same as index | AA API | ACTIVE | [S3] |
| **AA Scientific Reasoning** (HLE, CritPt) | Frontier science + physics research | 2,158 / 70 | same | AA API | ACTIVE | [S3] |
| **Terminal-Bench 4.0** (in AA index) | Terminal task execution, test-suite pass/fail | 66 tasks × 3 repeats | artificialanalysis.ai (runs); tbench.ai (upstream) | AA API only | ACTIVE (AA) | [S3][S23] |
| **Terminal-Bench 2.0 / 2.1 / Hard** | Terminal agent tasks | ~100 tasks in beta, TB-Core v0.1.1 | harbor-framework/terminal-bench-1; tbench.ai | HTML leaderboard only | LEGACY at AA; 2.0 ARCHIVED at Vals | [S23][S24][S22] |
| **SciCode** | Scientist-annotated Python subproblems, unit-test pass | 288 subproblems × 3 | artificialanalysis.ai (runs) | AA API | ACTIVE | [S3] |
| **HLE (Humanity's Last Exam)** | Expert-written frontier questions, closed answer | 2,158 (AA run) | lastexam.ai · hf.co/datasets/cais/hle | HF dataset, **gated + canary** | ACTIVE, not saturated | [S3][S12] |
| **GPQA Diamond** | PhD-level Google-proof science MCQ | 198 of 448 | hf.co/datasets/Idavidrein/gpqa | HF dataset, **gated** | LEGACY at AA; ARCHIVED/SAT at Vals | [S13][S20][S38] |
| **MMLU-Pro** | 14-discipline knowledge, 10-option MCQ | 12,032 | hf.co/datasets/TIGER-Lab/MMLU-Pro | HF dataset, open, MIT | LEGACY at AA; saturated (C) | [S14][S3] |
| **AIME 2025 / 2026** | Competition math, short answer | UNKNOWN (item count not verified) | AA legacy section; trackers | AA API (legacy field) | LEGACY at AA; SAT (C) | [S3][S39] |
| **MATH-500** | Competition math subset | 500 (by name) | HF (HuggingFaceH4/MATH-500, open) | HF dataset, open | LEGACY at AA; SAT (C) | [S3][S35] |
| **SWE-bench Verified** | Real GitHub issue → patch, pass@1 | 500 instances | swebench.com | **Yes — official JSON** | ARCHIVED/SAT at Vals | [S18][S19] |
| **SWE-bench Pro** | Contamination-resistant repo repair, 41 professional repos | 1,865 tasks | Scale AI public leaderboard | UNKNOWN (no JSON export found) | ACTIVE | [S30] |
| **LiveCodeBench** | Fresh contest problems, date-windowed | UNKNOWN (rolling) | livecodebench.github.io · HF code_generation_lite | HF open + repo | LEGACY at AA; ARCHIVED/SAT at Vals | [S3][S21][S36] |
| **IFBench** | Instruction-following under hard constraints | 294 prompts × 5 | AA additional evaluation | AA API | ACTIVE (not in index) | [S3] |
| **τ²/τ³-bench (retail, airline, telecom, banking)** | Dual-control tool-agent-user tasks, DB-state grading | text-v1 900 (6 langs × 3 domains); voice-v1 278; τ³-Banking 97 × 5 | github.com/sierra-research/tau2-bench | Repo results JSON; no CORS API | ACTIVE (v1.0.1 grading, Jul 2026) | [S25][S26][S3] |
| **AA-LCR v1.1** | Long-context reasoning over very long inputs | 100 × 3 | AA | AA API | ACTIVE | [S3] |
| **GDP.pdf** | Grounded reasoning over a long PDF | 100 tasks × 10 domains × 5 | AA | AA API | ACTIVE | [S3] |
| **MMMU-Pro** | Multimodal (visual) reasoning, 30 disciplines | 1,730 | HF MMMU/MMMU_Pro; AA runs | HF + AA | ACTIVE (standalone) | [S3] |
| **AA-Omniscience** | Knowledge recall **and** hallucination rate | 6,000 | AA | AA API | ACTIVE | [S3] |
| **LMArena / Arena Elo** | Human pairwise preference (blind A/B) | 1M–10M historical rows; 24 arena configs | hf.co/datasets/lmarena-ai/leaderboard-dataset | **Yes — HF parquet, CC-BY-4.0** | CROWD, ACTIVE | [S6][S7] |
| **ARC-AGI-1/2/3** | Novel abstract / interactive reasoning | UNKNOWN (private hold-out) | arcprize.org/leaderboard | No JSON found; Next.js payload | ACTIVE (95%+ on 2 & 3) | [S27][S28][S29] |
| **Open LLM Leaderboard** | 6 open-model tasks (v2) | — | hf.co/spaces/open-llm-leaderboard/… | Space (frozen) | **RETIRED 2025** | [S31][S44] |
| **Epoch AI Benchmarking Hub / ECI** | Cross-benchmark aggregate + raw results | 85 benchmarks, 391 models | epoch.ai/benchmarks | **Yes — CSV ZIP (CC-BY-4.0)** | ACTIVE aggregator | [S15][S16] |

---

## 3. Per-benchmark dossiers

### 3.1 Artificial Analysis family (the closest thing to an industry standard composite)

**Intelligence Index v4.3.2** — ten evaluations in four weighted categories [S3]:

| Category | Evaluation | Items | Repeats | Weight |
| --- | --- | --- | --- | --- |
| Agents **30%** | AA-Briefcase v1.1 | 91 tasks / 4 scenarios | 1 | 15% |
| | GDPval-AA v2.1 | 220 tasks | 1 | 10% |
| | AutomationBench-AA | 657 tasks | 1 | 5% |
| Coding **20%** | Terminal-Bench 4.0 | 66 | 3 | 10% |
| | SciCode | 288 subproblems | 3 | 10% |
| General **30%** | AA-Omniscience | 6,000 | 1 | 15% (accuracy 10 + 1−hallucination 5) |
| | GDP.pdf | 100 tasks | 5 | 10% |
| | AA-LCR v1.1 | 100 | 3 | 5% |
| Scientific **20%** | HLE | 2,158 | 1 | 10% |
| | CritPt | 70 | 5 | 10% |

Key properties for a dashboard: it is **text-only, English-only by design** (vision, speech and multilingual are benchmarked separately) [S3]; scoring is pass@1 throughout; temperature 0 for non-reasoning, 0.6 for reasoning models; sandboxing via e2b; AA keeps **internal copies** of every dataset, which is the main contamination mitigation [S3]. Additional evaluations reported but **not** in the index include IFBench (294×5), τ³-Banking (97×5), Harvey LAB-AA (120), APEX-Agents-AA (452×3), EnterpriseOps-Gym-AA (1,117×3), Terminal-Bench-Science (70×3), FrontierCode 1.1 (100×3), MLCR-AA (60×3), Global-MMLU-Lite (~6,000) and MMMU Pro (1,730) [S3].

**Naming correction worth encoding in the UI:** the October 2026 `/indexes` catalogue lists the Intelligence Index, a **Coding Agent Index**, a **Search Index**, a **Cyber Index**, a **Decision Index**, an **Openness Index**, and domain indexes (Finance & Accounting, Strategy & Ops, Legal, Healthcare & Medical, Engineering, Economics) [S1]. Set against the API contract, the accurate statement is: `artificial_analysis_coding_index` and `…_agentic_index` **do** exist as fields but are **subsets of the composite, not separately versioned**, and `artificial_analysis_math_index` is **absent from the 2.0 contract** [S47] — consistent with AIME/MATH-500 being retired [S3]. So: "coding/agentic subscore (unversioned)" is correct labelling; **"AA Math Index" is not a live instrument** (see §8 #1).

**Machine-readable access (re-verified 2026-10-22, and this part is time-critical):** AA is mid-migration. The legacy flat paths under `/api/v2/data/*` — including `/api/v2/data/llms/models`, the endpoint most third-party code uses — **retire on 2026-11-04 and then return `410 Gone`** [S45]. The current contract (OpenAPI 3.1, v2.0, 207 KB YAML) exposes `/api/v2/language/models/free` (free tier: headline indices only), `/api/v2/language/models` and `/models/{slug}` (Pro tier: per-benchmark scores), `/models/{slug}/performance`, `/providers`, `/providers/{slug}/performance`, `/providers/{slug}/measurements`, plus `/api/v2/critpt/evaluate` and 12 media model paths [S47]. All auth via the **`x-api-key`** header; without it every path returns **401** (probed: `/language/models/free`, `/language/models`, `/language/providers` all 401, while a non-existent `/data/llms/creators` returns 404 — so the mount is real) [S5][S47].

- **Tier reality:** `/free` gives you headline indices; per-benchmark sub-scores are a **Pro** feature [S47]. A free key therefore cannot power per-axis charts even after migration.
- **Rate limit:** the legacy reference page says 1,000 requests/day [S4]; a parallel pass over the current data-API docs reports **100 REST requests / 24 h** for Free, 500 for Pro [S48]. Unresolved discrepancy — **read `X-RateLimit-Limit` at runtime and do not hard-code either number**.
- **Field semantics:** composite indices are 0–100; individual benchmark scores are 0–1 fractions; Elo fields are Elo points (GDPval-AA pins DeepSeek V4.1 Flash (max) at 1600); `null` means *not measured*, never zero [S48]. `intelligence_index_version` is returned, and scores are only comparable within a major version [S47].
- **Client-side use is forbidden by the vendor's own docs** — *"To avoid publicly sharing keys and rate limits, please do not include in client side code and cache responses"* [S4] → proxy or build-time only.

### 3.1.1 Licensing gate (read before designing the product)

AA's *Pro Data Platform Terms* (verified text, 2026-10-22) bar a customer from making raw Data available "through any customer-facing product, API, **dashboard**, or service" (§2.4(c)), from combining Data with third-party sources into a product made available to third parties (§2.4(d)) — which is literally AA + OpenRouter — and from using Data to operate any product "whose primary purpose is benchmarking, ranking, comparison, competitive intelligence, or **model/provider selection guidance**… without Company's prior written consent" (§2.5), defining such a product as a "Competitive Product" (§1.9) [S46]. Plans-page wording (per the parallel dossier) reads Free = "internal use only with attribution; no redistribution", Pro = "restricted external use", Commercial = "commercial redistribution with attribution" [S48].

**Engineering consequence:** a *private, local* SOM instance is fine; a **public hosted** LLM-selector that renders AA scores needs written consent or a Commercial plan. Decide this before wiring AA into the UI, and keep an attribution footer either way. Alternatively, ship AA as an *optional plugin* the user keys themselves.

### 3.2 LMArena → "Arena" (human preference)

- Rebranded from LMArena to **Arena** in January 2026; `lmarena.ai` redirects to `arena.ai` (C) [S40]. Empirical: `https://arena.ai/api/leaderboard` and `https://lmarena.ai/api/leaderboard` both return **403** through Cloudflare to a non-browser client [S8].
- **The machine-readable path is the HF dataset**, verified live: `lmarena-ai/leaderboard-dataset`, `license: cc-by-4.0`, `gated: false`, 1M–10M rows, 24 configs (`text`, `text_style_control`, `vision`, `vision_style_control`, `webdev`, `document`, `search`, `search_factuality`, `agent`, `agent_tool_hallucination`, `agent_steerability`, `agent_bash_reliability`, `image_edit`, `text_to_image`, `text_to_video`, `video_edit`, `image_to_video`, …), splits `latest` / `full` [S6].
- Verified row schema (config `text_style_control`, split `latest`, snapshot `leaderboard_publish_date: 2026-10-20`): `model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date` [S7]. **This is ideal for an honest UI** — the confidence interval ships with the number.
- No official **keyed REST API for the leaderboard** was found; the only documented leaderboard endpoint I could reach is a third-party paid wrapper (`POST /api/lmarena/leaderboards`, 10 credits) whose own docs stress that overlapping `rating_lower`/`rating_upper` means models are not separated [S41]. **UNKNOWN:** whether Arena exposes an official private API.
- Interpretation limits: it measures *preference on the Arena prompt distribution*, not capability; it is gameable by verbosity/formatting; and it is a moving target (7.7M+ votes, ~389 text models per a C-level tracker) [S40].

### 3.3 Knowledge & science (the "saturated tier")

- **MMLU-Pro:** 12,032 questions over 14 disciplines, 10-option MCQ, MIT-licensed and fully open on HF [S14]. **Legacy at AA** (removed in v4.0) [S3]. Widely described as saturated at the frontier (C) [S39]. Keep only as a historical baseline in the UI.
- **GPQA Diamond:** 448 expert questions total; the Diamond subset is 198 (C) [S38][S13]; **gated** on HF with an explicit no-public-redistribution condition [S13]. **Legacy at AA**, **archived at Vals** because "24 of the 136 models tested now score 90% or higher" [S20]. Also the best cautionary tale in the corpus: Vals shows Claude Fable 5's published **93.18%** falling to **55.56%** when refusal-triggered fallbacks are counted as failures instead of successes [S20]. Any ingestion that ignores refusals inflates scores by tens of points.
- **HLE:** 2,158 items in AA's run [S3]; the HF release is **gated with a canary string** (`hle:3r2s:26b5c67b…`) and an explicit request not to redistribute [S12]. Not saturated — trackers put the frontier in a wide 10–46% band (C) [S37]. This is the best "headroom" axis available today.
- **ARC-AGI-1/2/3:** ARC-AGI-2 is at 91.3% (Gemini 4 Argon, $0.32/task) and ARC-AGI-3 at 97.5% (provider-adapter harness) / 49.8% (standard harness) per ARC Prize's own account [S27]; the September 2026 snapshot has ARC-AGI-2 at 95% for GPT-6 Astra (C) [S37]. **No machine-readable endpoint found** — `arcprize.org/leaderboard` is a Next.js page with the payload inlined, no `.json`, no CORS [S28] (verified). ARC-AGI-3 is also a *competition* (Kaggle, $2M, submissions due 2026-11-02) [S29], so its leaderboard is a contest board, not a model benchmark.

### 3.4 Coding (where the 2026 action is)

- **SWE-bench Verified:** officially archived by Vals as saturated; their last top score is Claude Opus 5 (mini-SWE-agent harness) at **97.00%** (2026-09-01) [S19]. **But it has the best free data pipe in the whole landscape:** `https://raw.githubusercontent.com/swe-bench/swe-bench.github.io/master/data/leaderboards.json` — verified **HTTP 200, 4.09 MB**, official repo, structure `{leaderboards: [{name: "Multilingual", results: [{agent, agent_org, checked, cost, date, folder, instance_cost, …}]}]}` [S18], served with `access-control-allow-origin: *` [S11]. Note the fields: **agent + harness are part of the identity of a result**, not metadata.
- **SWE-bench Pro (Scale AI):** the intended successor — 1,865 tasks across 41 professional repositories, pass@1, explicitly built as contamination-resistant; frontier models that clear 80–95% on Verified solve roughly 60% here (C) [S30]. Caveats from the same source: Scale's own footnote marks top rows as `mini-swe-agent` runs, and the maintainers **closed a git-history exploit in March 2026**; 116 Verified entries in one aggregator are vendor self-reported and none independently verified [S30]. **UNKNOWN:** any official JSON/CSV export for Pro.
- **LiveCodeBench:** contamination-resistance comes from *time windows* (score only problems published after a model's cutoff) [S39]; it is **archived/saturated** at Vals (top 89.78%, top models within ~2 points) [S21], and **legacy** at AA [S3]. Fresh evidence of its fragility: an open GitHub issue (2026-09-27) reports that generations disqualified by the input-echo guard are dropped from the pass@1 **denominator** rather than scored 0 — i.e. the headline metric can silently change definition [S36]. If you display LCB, pin the runner version.
- **SciCode** is the quietly reliable one: 288 scientist-annotated subproblems, all unit tests must pass, 3 repeats, 10% of the AA index, no tool use [S3].
- **Terminal-Bench:** the upstream repo is now `harbor-framework/terminal-bench-1` (2.6k stars, last push 2026-07-11), still described as **beta with ~100 tasks**, dataset `terminal-bench-core` v0.1.1, and `harbor` is the framework for Terminal-Bench 2.0 [S23]. The leaderboard at `tbench.ai` is HTML-only (`/api/leaderboard` → 404, verified) [S24]. AA runs its own **Terminal-Bench 4.0** at 66 tasks × 3 [S3] — a **different instrument from the public tbench board**; never merge them in one chart.

### 3.5 Agentic tool use (τ-bench)

- `sierra-research/tau2-bench` (2.3k stars, pushed **2026-10-21**) is now **τ-bench 2.0**: `text-v1` = 900 tasks (6 languages × 3 domains, 50 frozen tasks/domain), `voice-v1` = 278, `voice-v2`/τ-i18n = 900, plus an `intake` domain (200+ tasks) and a `banking_knowledge` retrieval domain; grading is backend-database state, not text matching [S25].
- **Version trap:** v1.0.1 (July 2026) fixed `banking_knowledge` task errors and **re-graded affected submissions**; results from `<1.0.1` are explicitly not comparable [S25]. This is exactly the kind of thing a dashboard must surface as "run version".
- **AA reports τ³-Banking (97 tasks × 5) as an additional evaluation** and τ²-Bench Telecom only as legacy [S3]. The public τ-bench site lists τ²-bench (retail/airline/telecom) with pass^1 and points to τ³-bench (March 2026) for voice and knowledge-intensive variants [S26].
- No CORS-enabled API; results live as files under `data/tau2/results/final` in the repo (verified listing) [S25].

### 3.6 Instruction following, factuality, long context, multimodal

- **IFBench:** 294 prompts × 5 repeats, extraction + rule-driven assessment, pass@1; **additional** evaluation, not in the index [S3]. For extraction pipelines this is arguably more decision-relevant than HLE.
- **AA-Omniscience:** 6,000 items scored as accuracy **plus** `1 − hallucination rate` as separate components [S3]. Unique in the landscape: it is the only widely published score that *penalises confident wrongness* — the correct axis for "cheap high-volume extraction".
- **Long context:** AA-LCR v1.1 (100 questions × 3) and GDP.pdf (100 long-PDF tasks × 5, all-pass + task-macro mean pass) [S3]; MLCR-AA (60, expert + compound tiers, conciseness gate + 3-judge panel) [S3]. Token counts alone (OpenRouter `context_length`) are a *capacity* claim, not a *capability* claim — keep them on separate axes.
- **Multimodal:** MMMU Pro (1,730, 10-option MCQ, regex extraction) is reported standalone, not in the index [S3]; Arena `vision` and `vision_style_control` boards give preference signal with CIs [S6].

### 3.7 Open LLM Leaderboard

Retired/archived in 2025; the team's farewell thread confirms the end of the project and points to a follow-on "Open Evals hub" org [S31]. The Space remains readable as a frozen artifact [S44]. **Do not ingest as a live source.** It is, however, the best documented case of leaderboard gaming: a 2026 Show-HN reports reaching #1 on it by **duplicating a block of ~7 middle layers of Qwen2-72B without modifying any weights**, with the top 4 entries still being descendants of that trick (D — single anecdote, but technically specific and widely discussed) [S32].

### 3.8 Cross-benchmark aggregators (build on these, don't rebuild them)

**Epoch AI Benchmarking Hub** — 85 benchmarks, 391 models, an **Epoch Capabilities Index (ECI)** composite, updated 2026-09-20 [S15]. Downloads: `https://epoch.ai/data/benchmark_data.zip` (CSV, verified **200 / application/zip**), **CC-BY-4.0** with attribution, plus a `epochai` Python client over Airtable that preserves entity relationships [S16]. Epoch runs its own evals (GPQA Diamond, MATH Level 5, Mock AIME 2024-25, FrontierMath incl. **FrontierMath Erdős** with 68 unsolved problems, SWE-bench Verified) using the Inspect framework, publishes task definitions as gists and per-run log viewers, and blocks bots from the log viewer to reduce leakage [S15]. Crucially it does its own contamination warning: it says MATH Level 5 results are particularly exposed to leakage and moved to harder benchmarks as older ones saturated [S15].

---

## 4. What a static app can and cannot fetch (concrete, tested)

All probes run 2026-10-22 with an `Origin` header; result = presence of `Access-Control-Allow-Origin` (ACAO).

| Endpoint | Auth | ACAO | Browser-direct? | Verdict |
| --- | --- | --- | --- | --- |
| `GET https://openrouter.ai/api/v1/models` | none | `*` | **YES** (200, 468 models) | Primary catalog: price, `context_length`, `architecture.modality`, `supported_parameters`, `reasoning`, `hugging_face_id` [S9] |
| `GET https://openrouter.ai/api/v1/models/{author}/{slug}/endpoints` | none | `*` | **YES** (200) | Provider-level price/latency/throughput [S10] |
| `GET https://huggingface.co/api/datasets/lmarena-ai/leaderboard-dataset` | none | origin echo | **YES** | Dataset metadata, 24 configs [S6][S11] |
| `GET https://datasets-server.huggingface.co/rows?dataset=lmarena-ai%2Fleaderboard-dataset&config=text_style_control&split=latest&offset=0&length=100` | none | origin echo | **YES** | Arena Elo + CI + votes, paginated [S7][S11] |
| `GET https://raw.githubusercontent.com/swe-bench/swe-bench.github.io/master/data/leaderboards.json` | none | `*` | **YES** (4.09 MB) | Official SWE-bench results incl. harness/agent/cost [S18][S11] |
| `raw.githubusercontent.com` anything (tau2 results, Terminal-Bench tasks) | none | `*` | **YES** | Fine for small files; 4 MB+ needs caching [S11] |
| `GET https://artificialanalysis.ai/api/v2/language/models/free` | **`x-api-key`** | none seen (401) | **NO** | Free tier: headline indices only [S47] |
| `GET https://artificialanalysis.ai/api/v2/language/models` | **`x-api-key`** (Pro) | none seen (401) | **NO** | Per-benchmark sub-scores; Pro tier [S47] |
| `GET https://artificialanalysis.ai/api/v2/data/*` (legacy) | `x-api-key` | — | **NO** | **`410 Gone` after 2026-11-04** [S45] |
| `GET https://epoch.ai/data/benchmark_data.zip` | none | **absent** | **NO** (CORS block) | Build-time ingest; CC-BY-4.0; unzip at build (JSZip/Node) [S16][S17] |
| `https://arena.ai/api/leaderboard` | — | **403** | **NO** | Cloudflare; use the HF dataset instead [S8] |
| `https://arcprize.org/leaderboard` | — | absent, Next.js inline payload | **NO** | Proxy/scrape; or store a curated snapshot [S28] |
| `https://www.tbench.ai/leaderboard` | — | absent, HTML-only | **NO** | Proxy/scrape; `/api/leaderboard` 404 [S24] |
| `https://datasets-server.huggingface.co/rows?dataset=cais%2Fhle…` | HF token | — | **NO** | Gated: "not accessible without authentication" [S11][S12] |

**Recommended architecture for SOM (static-first, no server):**
1. A scheduled GitHub Action (or manual script) **ingests** AA (keyed, `/api/v2/language/models` — *not* the retiring `/data/*` paths [S45]) and Epoch (zip) and any scraped ARC/Terminal-Bench/Pro rows into a normalized `data/benchmarks.json` committed to the repo, with `source`, `retrieved_at`, `run_version`, `harness`, `status`. Gate on the consent question in §3.1.1 before this feeds a public deployment.
2. The browser fetches **only** CORS-safe sources live (OpenRouter catalog, LMArena parquet rows, SWE-bench JSON) and reads everything else from the frozen snapshot.
3. Never ship an API key. If live AA data is a requirement, that is the one justification for a proxy (a tiny Worker/Pages Function with caching is enough).

---

## 5. Recommended default benchmark set for a selector — 8 axes

Design constraints: every axis must be (a) currently run by someone credible, (b) at least partly populated with per-model numbers, and (c) not saturated to the point of noise. Where a source is missing for a model, the composite **renormalises** over the axes that exist and shows coverage (see §7).

| # | Axis | Default weight | Primary data | Secondary / headroom | Why this axis exists |
| --- | --- | --- | --- | --- | --- |
| 1 | **Reasoning & knowledge depth** | 18% | AA Intelligence Index v4.3.2 [S3] | HLE (2,158) for headroom [S3][S12] | Single best at-a-glance capability synthesis |
| 2 | **Agentic execution** | 15% | AA Agents category (AA-Briefcase 15, GDPval-AA 10, AutomationBench 5) [S3] | τ³-Banking 97×5 [S3], τ-bench repo [S25] | 30% of AA's own weighting is agents — the market has moved here |
| 3 | **Coding (repo-level)** | 15% | SWE-bench Pro pass@1 (C) [S30] | Terminal-Bench 4.0 [S3]; SWE-bench Verified JSON for history only [S18] | Verified is saturated; Pro is the contamination-resistant successor |
| 4 | **Instruction / format compliance** | 10% | IFBench 294×5 [S3] | Arena `text_factuality` | Decides whether a pipeline works at all |
| 5 | **Factuality (non-hallucination)** | 10% | AA-Omniscience `1 − hallucination` [S3] | Vals refusal-corrected views (pattern) [S20] | Penalises confident wrongness; critical for extraction & research |
| 6 | **Long context** | 10% | AA-LCR v1.1 + GDP.pdf [S3] | OpenRouter `context_length` as *capacity* only [S9] | Capacity ≠ capability; needs its own axis |
| 7 | **Multimodal** | 7% | MMMU-Pro 1,730 [S3] | Arena `vision` Elo + CI [S6] | Image input is a hard filter, rarely a score |
| 8 | **Cost / latency / throughput** | 15% | AA **cost per task** + blended price 7:2:1 [S2] | OpenRouter per-endpoint price/speed [S10] | A model twice as good at 10× the price is a different product |

**Why these numbers.** There is **no published, validated study** that assigns optimal weights for model selection — I did not find one, and any tool claiming otherwise is inventing. The defaults above are an editorial synthesis anchored on the only published weighting in the field (AA's Agents 30 / Coding 20 / Scientific 20 / General 30 [S3]), flattened toward task breadth and cost because a selector serves many workloads. The one external weighting example I found (BenchAlign v5.8: Agentic 22% overall, Terminal-Bench 2.0 = 6% of the agentic block) is a single vendor's calibrated model and should be treated as C-level [S37]. **Expose the weights to the user and label them "defaults, not truth."**

**Additional rule:** never include a benchmark whose publisher has marked it archived/saturated. If a user wants it, render it in a separate "historical" strip, visually de-emphasised [S19][S20][S21][S22].

---

## 6. Per-use-case weight profiles

Same eight axes, renormalised to 100. These are starting profiles, not optima.

| Axis | (a) Coding agent | (b) Cheap high-volume extraction | (c) Multimodal assistant | (d) Long-context research |
| --- | --- | --- | --- | --- |
| Reasoning & knowledge | 10 | 5 | 12 | 15 |
| Agentic execution | **25** | 0 | 8 | 5 |
| Coding (repo-level) | **30** | 0 | 5 | 0 |
| Instruction / format | 8 | **20** | 10 | 8 |
| Factuality | 5 | **20** | 12 | **20** |
| Long context | 7 | 15 | 10 | **30** |
| Multimodal | 0 | 5 | **30** | 7 |
| Cost / latency / throughput | 15 | **35** | 13 | 15 |

Rationale, with the sources that support the *direction* (not the exact numbers):

- **(a) Coding agent** — the discriminating signal in 2026 is repo-level, harness-reported agent performance, not single-function generation: SWE-bench Verified is saturated (97.00% top) [S19], SWE-bench Pro separates models at ~60% [S30], and Terminal-Bench measures the actual terminal loop [S23][S3]. Practitioners converge on "match the benchmark to the task, then verify on your own workload" [S43][S42]. Cost stays at 15% because agent runs are token-hungry and cache-hit rate materially changes the bill [S2].
- **(b) Cheap high-volume extraction** — capability is nearly free here; the failure modes are format drift, hallucinated fields, and price. Hence instruction-following + factuality dominate, and cost is the single largest axis. AA's `cost per task` (which multiplies real token usage, including reasoning tokens, by the index weights) is a better budget input than $/token [S2]. Note that reasoning models with 2k+ reasoning tokens can cost more per extraction than a "cheaper" model — measure, don't infer [S2].
- **(c) Multimodal assistant** — MMMU-Pro plus Arena's `vision` board and, importantly, an explicit **modality filter** from OpenRouter `architecture.input_modalities` before scoring anything [S9][S3][S6].
- **(d) Long-context research** — GDP.pdf and AA-LCR are the only published probes that actually test *grounded use of a long document* rather than needle retrieval [S3]; factuality is co-equal because long-context models fail by confident synthesis, and Omniscience is the only score that prices that in [S3]. When a context claim comes from a vendor's "1M tokens", treat it as capacity only [S9].

---

## 7. Gaming, contamination, saturation — and how to present uncertainty honestly

### 7.1 The six failure modes, with evidence

1. **Saturation (benchmark outlives its discriminative power).** Vals archived four benchmarks in one year, each with the same reason [S19][S20][S21][S22]. A February 2026 saturation study of 60 benchmarks reportedly finds nearly half saturated, correlated with benchmark age and test-set size [S34]; Stanford HAI's 2026 AI Index is cited for the same figure [S34]. Treat "saturated" as a *state that must be re-checked*, not a fixed property.
2. **Contamination (test items in training data).** Mitigations differ by publisher: HLE ships a canary string and gates the data [S12]; GPQA gates it with a no-redistribution condition [S13]; AA stores internal copies and uses pass@1 with fixed prompts [S3]; LiveCodeBench windows by publication date [S39]; SWE-bench Pro was rebuilt on repositories/tasks chosen to resist memorisation (C) [S30]. Epoch publishes task-definition gists and blocks bots from its log viewer specifically to reduce leakage [S15].
3. **Harness/scaffold dependence.** ARC-AGI-3: 97.5% vs 49.8% for the same model under two harnesses [S27]. SWE-bench: 10–20 pp reported swing from scaffolding [S33], and the official JSON makes `agent`/`agent_org` first-class fields precisely because the harness is part of the result [S18].
4. **Metric-definition drift.** Vals' refusal-fallback correction moves GPQA from 93.18% to 55.56% [S20]; LiveCodeBench's input-echo guard changes the pass@1 denominator [S36]; τ-bench v1.0.1 re-graded a domain and invalidated old comparisons [S25]; AA changed index versions (v4.0 retired the 2024 canon) [S3].
5. **Vendor self-reporting.** A September 2026 tracker notes all 116 SWE-bench Verified entries it lists are vendor self-reported and none independently verified [S30]. Prefer independent runners (AA, Epoch, Vals) and badge the difference.
6. **Outright gaming.** The Open LLM Leaderboard #1 achieved by duplicating ~7 middle layers with no weight changes [S32]; a closed git-history exploit in mini-swe-agent [S30]. Both are D/C-level, but they are the right *kind* of evidence: the attack surface is the scoring script, not the model.

### 7.2 UI rules that keep the comparison honest

1. **Always show a confidence interval.** LMArena ships `rating_lower`, `rating_upper`, `variance`, `vote_count` [S7]; AA ships `ci95` [S4]. If two models' intervals overlap → render them **tied**, and say so. Never show a bare rank as if it were a measurement.
2. **Rank ranges, not ranks.** With overlapping CIs, publish "top 5–9" bands. This is the single highest-value honesty feature and it is free with the data above.
3. **Provenance badge on every number:** `independent` (AA/Epoch/Vals) · `vendor` (self-reported) · `crowd` (Arena votes) · `community` (Kaggle/Show-HN). Filter by badge.
4. **Status badge:** `active` / `legacy` / `archived-saturated` / `competition`. Grey out archived rows and exclude them from composites.
5. **Harness + run version are columns, not tooltips.** Store `harness`, `run_version`, `scored_at` with every result. Refuse to draw a line across different harnesses or `tau2 <1.0.1` [S25][S18].
6. **Missing ≠ zero.** Renormalise the composite over available axes and show a **coverage %** per model. A model with 4 of 8 axes at 95% is not "better" than one with 8 of 8 at 90% — it is less known.
7. **Never one number alone.** Every composite in the UI must expand into its axes inline; the canonical failure is the "purchase order" composite [S43][S42].
8. **Cost as $/task, with assumptions visible.** AA's cost-per-task multiplies input/cached/output prices by tokens actually consumed, weighted by the index weights [S2]; a per-token price comparison hides reasoning-token burn and caching differences [S2].
9. **Freshness stamp per source** (Arena snapshot date is `leaderboard_publish_date` [S7]; Epoch refreshed 2026-09-28 [S16]; AA live; SWE-bench repo pushed 2026-09-01 [S18]).
10. **Say when a benchmark is headroom-testable**: HLE and ARC-AGI-3 still separate models [S3][S27]; MMLU-Pro, GPQA, AIME, MATH-500 and LiveCodeBench no longer do at the frontier [S3][S20][S21][S39].

---

## 8. Contradictions and open questions

| # | Issue | Positions | Resolution / action |
| --- | --- | --- | --- |
| 1 | "AA Math Index / AA Coding Index" | The brief assumes named indexes; the `/indexes` catalogue lists Intelligence Index, Coding **Agent** Index, Search, Cyber, Decision, Openness + six domain indexes, with math/coding as category tags [S1] | **Resolved via the contract**: `artificial_analysis_coding_index` and `…_agentic_index` do exist as API fields (subsets of the composite, **not separately versioned**), while `artificial_analysis_math_index` appears **0 times** in the 2.0 contract [S47] — consistent with AA retiring AIME/MATH-500 [S3]. Label them "subscore (unversioned)", never "Math Index". Confidence: high |
| 2 | SWE-bench Pro top model | BenchLM (C) says Claude Opus 5.5 at 89.9%; CodingFleet (C) says Qwen3.8-Flash-Next 62.5% / Qwen3.8-27B 61.7%; morphllm (C) says Muse Spark 1.1 at 61.5% on Scale's standardized set and 51.5% on the commercial set [S30][S37] | These are **different sets and harnesses** (Scale public vs commercial vs vendor self-report). Do not publish a merged Pro ranking; label the board. Confidence in any single figure: low |
| 3 | ARC-AGI-2 frontier score | 91.3% (ARC Prize, verified runs) [S27] vs 95% GPT-6 Astra (aggregator, Sept 2026) [S37] | Prefer ARC Prize's verified board; treat the 95% as unverified. Confidence: moderate for 91.3% |
| 4 | "Nearly half of 60 benchmarks saturated" | Attributed to a Feb 2026 study and to Stanford HAI's 2026 AI Index, both via secondary summaries [S34] | Directionally credible, primary study not read. Confidence: low — cite as "reported", never as our measurement |
| 5 | GPQA Diamond item count | 448 total questions in the original release [S13]; 198 in the Diamond subset [S38] | Use 448 for "GPQA", 198 for "Diamond", badge the subset. Confidence: high for 448, moderate for 198 |
| 6 | Scope of Terminal-Bench | Upstream repo is **beta, ~100 tasks**, TB-Core v0.1.1 [S23]; AA runs **Terminal-Bench 4.0, 66 tasks × 3** [S3]; public tbench board is HTML-only [S24] | Three different instruments sharing a name. Store the publisher in the key. Confidence: high |

**Explicit UNKNOWNs (do not fill in with guesses):**
- LiveCodeBench current problem count per date window.
- AIME 2025/2026 item counts used by any tracker; MATH-500 is 500 by name only.
- SWE-bench Pro machine-readable export (none found).
- ARC-AGI machine-readable leaderboard endpoint (none found).
- LMArena/Arena official keyed leaderboard API (existence unknown).
- AA free-tier **rate limit** (100/day per current docs vs 1,000/day per the legacy reference page) and the exact per-field coverage of the `free` payload — both need a key to settle [S4][S47][S48].
- Whether AA will grant consent / require Commercial terms for a hosted selectors (§3.1.1) — a commercial decision, not a research one [S46].
- MMMU-Pro / MMLU-Pro / GPQA status at other trackers (only AA + Vals checked).
- τ-bench leaderboard row counts per model (site is HTML; repo results files are per-submission).

---

## 9. Sources

- **[S1]** Artificial Analysis. «Indexes» (catalogue of current indexes: Intelligence Index v4.3.2, Coding Agent, Search, Cyber, Decision, Openness, domain indexes). https://artificialanalysis.ai/indexes · official/docs · **A** · read in full · accessed 2026-10-22
- **[S2]** Artificial Analysis. «Benchmarking Methodology» (definitions: blended price 7:2:1, cost per task, TTFT, reasoning tokens). https://artificialanalysis.ai/methodology · official/docs · **A** · full · 2026-10-22
- **[S3]** Artificial Analysis. «Intelligence Benchmarking Methodology — Intelligence Index v4.3.2» (10 evaluations, category weights, item counts, legacy list, testing parameters, e2b sandbox, internal dataset copies). https://artificialanalysis.ai/methodology/intelligence-benchmarking · official/docs · **A** · full · 2026-10-22
- **[S4]** Artificial Analysis. «API Reference — Free Artificial Analysis Data API» (`x-api-key`, 1,000 req/day, "do not include in client side code and cache responses", `GET /data/llms/models`, `ci95` field). https://artificialanalysis.ai/api-reference · official/docs · **A** · full · 2026-10-22
- **[S5]** Measurement (mine). `GET https://artificialanalysis.ai/api/v2/data/llms/models` without key → **HTTP 401**, no ACAO header. · measurement · **A** · 2026-10-22
- **[S6]** Hugging Face. «lmarena-ai/leaderboard-dataset» (CC-BY-4.0, un-gated, 24 configs, splits `latest`/`full`, last modified 2026-10-21). https://huggingface.co/datasets/lmarena-ai/leaderboard-dataset · official dataset · **A** · metadata + config list · 2026-10-22
- **[S7]** Measurement (mine). `GET https://datasets-server.huggingface.co/rows?dataset=lmarena-ai%2Fleaderboard-dataset&config=text_style_control&split=latest` → fields `model_name, organization, license, rating, rating_lower, rating_upper, variance, vote_count, rank, category, leaderboard_publish_date` (`2026-10-20`). · measurement · **A** · 2026-10-22
- **[S8]** Measurement (mine). `https://arena.ai/api/leaderboard` and `https://lmarena.ai/api/leaderboard` → **HTTP 403** (Cloudflare), no JSON. · measurement · **A** · 2026-10-22
- **[S9]** Measurement (mine). `GET https://openrouter.ai/api/v1/models` → 200, `access-control-allow-origin: *`, 468 models; fields include `pricing{prompt,completion}`, `context_length`, `architecture{modality,input_modalities,output_modalities,tokenizer}`, `supported_parameters`, `reasoning`, `hugging_face_id`, `created`. · measurement · **A** · 2026-10-22
- **[S10]** Measurement (mine). `GET https://openrouter.ai/api/v1/models/{author}/{slug}/endpoints` → 200, ACAO `*` (provider-level price/latency). · measurement · **A** · 2026-10-22
- **[S11]** Measurement (mine). CORS probes: `huggingface.co/api/...` and `datasets-server.huggingface.co/rows` reflect the request Origin; `raw.githubusercontent.com` returns `*`; `epoch.ai` and `arcprize.org` return **no** ACAO; gated HLE rows require auth ("not accessible without authentication"). · measurement · **A** · 2026-10-22
- **[S12]** Hugging Face / Center for AI Safety & Scale AI. «cais/hle» dataset card (gated, canary string `hle:3r2s:26b5c67b-…`, "please help us protect the integrity of this benchmark by not publicly sharing, re-uploading, or distributing"). https://huggingface.co/datasets/cais/hle · official dataset · **A** · card · 2026-10-22
- **[S13]** Idavidrein. «GPQA» dataset card (448 multiple-choice questions, biology/physics/chemistry; gated with no-redistribution condition; expert 65% / non-expert 34%). https://huggingface.co/datasets/Idavidrein/gpqa · official dataset · **A** · card · 2026-10-22
- **[S14]** TIGER-Lab. «MMLU-Pro» dataset card (12,032 questions, 14 disciplines, per-discipline table, 10 options). https://huggingface.co/datasets/TIGER-Lab/MMLU-Pro · official dataset · **A** · card · 2026-10-22
- **[S15]** Epoch AI. «AI Benchmarks & Capabilities» hub (85 benchmarks, 391 models, ECI, FrontierMath Erdős 68 problems, Inspect framework, task-definition gists, contamination caveats, log viewer, bot-blocking). https://epoch.ai/benchmarks · official · **A/B** · full · 2026-10-22 (page dated 2026-09-20)
- **[S16]** Epoch AI. «Use this data» (CSV ZIP download `/data/benchmark_data.zip`, CC-BY-4.0 attribution, `epochai` Python client over Airtable, citation). https://epoch.ai/benchmarks/use-this-data · official · **A** · full · 2026-10-22 (data updated 2026-09-28)
- **[S17]** Measurement (mine). `https://epoch.ai/data/benchmark_data.zip` → 200, `application/zip`; **no** ACAO on zip or HTML. · measurement · **A** · 2026-10-22
- **[S18]** SWE-bench. Official leaderboard data `data/leaderboards.json`, 4,091,442 bytes, structure `{leaderboards:[{name,results:[{agent,agent_org,checked,cost,date,folder,instance_cost,…}]}]}`; repo `SWE-bench/swe-bench.github.io` last push 2026-09-01. https://raw.githubusercontent.com/swe-bench/swe-bench.github.io/master/data/leaderboards.json · official data · **A** · parsed · 2026-10-22
- **[S19]** Vals AI. «SWE-bench Verified» — "Archived Benchmark: since performance on this benchmark has saturated, we no longer run this benchmark on new model releases"; Claude Opus 5 (mini-SWE-agent) 97.00% at 2026-09-01. https://www.vals.ai/benchmarks/swebench · independent evaluator · **B** · key takeaways · 2026-10-22
- **[S20]** Vals AI. «GPQA Diamond» — archived; "24 of the 136 models tested now score 90% or higher"; Claude Fable 5's 93.18% falls to 55.56% when refusal-triggered fallbacks count as failures. https://www.vals.ai/benchmarks/gpqa · independent evaluator · **B** · key takeaways · 2026-10-22
- **[S21]** Vals AI. «LiveCodeBench» — archived; Claude Fable 5 at 89.78%, top models within ~2 points. https://www.vals.ai/benchmarks/lcb · independent evaluator · **B** · key takeaways · 2026-10-22
- **[S22]** Vals AI. «Terminal-Bench 2.0» — archived; GPT-5.5 73.20%, Opus 4.8 70.04%. https://www.vals.ai/benchmarks/terminal-bench-2 · independent evaluator · **B** · key takeaways · 2026-10-22
- **[S23]** Terminal-Bench. Repo now `harbor-framework/terminal-bench-1` (2,604 stars, push 2026-07-11); README: "currently in beta with ~100 tasks", dataset `terminal-bench-core` v0.1.1, `harbor` framework for Terminal-Bench 2.0, task registry at tbench.ai/docs/registry. https://github.com/laude-institute/terminal-bench · official repo · **A** · README · 2026-10-22
- **[S24]** Measurement (mine). `https://www.tbench.ai/leaderboard` → 200 HTML; `https://www.tbench.ai/api/leaderboard` → **404**. · measurement · **A** · 2026-10-22
- **[S25]** Sierra Research. τ-bench repo README — τ-bench 2.0: `text-v1` 900 tasks (6 languages × 3 domains, 50 frozen/domain), `voice-v2` 900, `voice-v1` 278, `intake` domain 200+ tasks, `banking_knowledge`; v1.0.1 (Jul 2026) grading fix re-grades banking results, pre-1.0.1 not comparable; results under `data/tau2/results/final`. https://github.com/sierra-research/tau2-bench · official repo · **A** · README · 2026-10-22
- **[S26]** τ-bench site. τ²-bench (retail/airline/telecom) pass^1 table; τ³-bench (March 2026) adds voice and knowledge-intensive variants (~700-document knowledge base). https://taubench.com · official site · **B/C** · page · 2026-10-22
- **[S27]** ARC Prize (@arcprize). Verified results post, 2026-10-15: Gemini 4 Argon — ARC-AGI-3 **97.5%** ($4.8K, provider-adapter harness) / **49.8%** ($5.8K, standard harness); ARC-AGI-2 **91.3%** ($0.32/task); ARC-AGI-1 98.5%. https://x.com/arcprize · official account · **B** · post text · 2026-10-22
- **[S28]** ARC Prize. Community leaderboard (ARC-AGI-1/2/3 rows, scorecards, costs); main leaderboard is a Next.js page with inlined payload and no ACAO. https://arcprize.org/leaderboard/community · official · **B** · page · 2026-10-22
- **[S29]** ARC Prize. «ARC Prize 2026» — $2M, three tracks, ARC-AGI-3 + ARC-AGI-2 via Kaggle, submissions due 2026-11-02. https://arcprize.org/competitions/2026 · official · **B** · page · 2026-10-22
- **[S30]** Morph LLM. «SWE-bench Pro Leaderboard» (2026-09-14) — SWE-bench Pro: 1,865 tasks, 41 professional repos, pass@1, contamination-resistant; ~60% frontier vs 80–95% on Verified; Scale footnote: top public rows are `mini-swe-agent`; mini-swe-agent git-history exploit closed Mar 2026; 116 Verified entries vendor self-reported, none independently verified. https://www.morphllm.com/swe-bench-pro · practitioner blog · **C** · excerpts · 2026-10-22
- **[S31]** Hugging Face. Open LLM Leaderboard farewell thread «It's been a wild ride, folks :) (end of the Open LLM Leaderboard)», 2025-03-13 (points to "Open Evals hub"). https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard/discussions/1135 · official project · **B** · excerpt · 2026-10-22
- **[S32]** Hacker News. «How I topped the HuggingFace open LLM leaderboard on two gaming GPUs» (duplicating a ~7-layer block of Qwen2-72B with no weight changes; top 4 entries still descendants), 2026-03-10. https://news.ycombinator.com/item?id=47322887 · forum · **D** · excerpt · 2026-10-22
- **[S33]** Digital Applied. «LLM Benchmark Methodology 2026: Reading Leaderboards» — headline score least reliable; 10–20 pp SWE-bench scaffold swing; static-eval shelf life <2 years; arena ranks live inside overlapping CIs. https://www.digitalapplied.com/blog/llm-benchmark-methodology-2026-contamination-leaderboard-guide · practitioner blog · **C** · excerpts · 2026-10-22
- **[S34]** Atlan. «LLM Benchmarks Explained» (2026-07-27) — cites Stanford HAI 2026 AI Index: nearly half of the 60 most-cited LLM benchmarks saturated; plus a 2025-26 contamination survey. https://atlan.com/know/llm-benchmarks-explained · practitioner blog · **C** · excerpt · 2026-10-22
- **[S35]** Epoch AI FAQ (inside [S15]) — why GPQA Diamond/MATH Level 5 were chosen, "MATH Level 5 now reaching saturation", added Mock AIME / FrontierMath, leakage risk caveats. https://epoch.ai/benchmarks · official · **A** · full · 2026-10-22
- **[S36]** LiveCodeBench GitHub issue #159 (2026-09-27) — "generations disqualified by the input-echo guard are dropped from the pass@1 denominator instead of being scored False". https://github.com/LiveCodeBench/LiveCodeBench/issues · project repo · **A** (open issue, unresolved) · title · 2026-10-22
- **[S37]** BenchLM.ai. Benchmark pages: Terminal-Bench 2.0 (GPT-5.5 82%, 45 models; BenchAlign v5.8: Agentic 22% overall, TB 2.0 = 6% of agentic), τ²-bench (144 models, excluded from scoring), ARC-AGI-2 (GPT-6 Astra 95%, 2026-09-27), LiveCodeBench (Qwen3.7 Max 91.6%), HLE (top 10–46%). https://benchlm.ai/benchmarks/terminal-bench-2 · aggregator · **C** · excerpts · 2026-10-22
- **[S38]** Klu.ai. «GPQA eval» glossary — Diamond set 198 questions; "As of October 2026, GPQA Diamond is saturated for frontier comparison… no longer separates the top models". https://klu.ai/glossary/gpqa-eval · glossary/blog · **C** · excerpt · 2026-10-22
- **[S39]** Layer3 Labs. «AI Reasoning Benchmarks: GPQA, MMLU, and Math, Explained» (2026-08-02) — "the most saturated and most contaminated of all AI benchmarks"; AIME 2026 ~89.2% for cited models. https://www.layer3labs.io/guides/ai-reasoning-benchmarks · practitioner blog · **C** · excerpt · 2026-10-22
- **[S40]** Opper.ai. «LLM rankings in 2026: how leaderboards work and which to trust» (2026-08-17) — Arena rebrand from LMArena (Jan 2026); 7.7M+ votes, 389 models on text; how Arena ranks and whether it can be gamed. https://opper.ai/blog/llm-rankings-explained · practitioner blog · **C** · excerpt · 2026-10-22
- **[S41]** Anysite. `/lmarena/leaderboards` API doc — third-party wrapper (`POST /api/lmarena/leaderboards`, 10 credits); notes that overlapping `rating_lower`/`rating_upper` means models are not separated by the data; `vote_cutoff_at` trails today by days. https://app.anysite.io/docs/api/post-api-lmarena-leaderboards · third-party vendor · **C** · doc · 2026-10-22
- **[S42]** Requesty. «Smartest AI models 2026: Artificial Analysis Intelligence Index» — "best at-a-glance signal for raw model intelligence, but always validate on your own workload, since the best model for a specific task is often not the highest overall". https://www.requesty.ai/models/rankings/intelligence · vendor blog · **C** · excerpt · 2026-10-22
- **[S43]** ToLearn. «LLM Coding Benchmarks 2026» — "match the benchmark to the task before choosing a model, then verify the source date, scaffold, and success metric". https://tolearn.blog/blog/llm-coding-benchmark-comparison-2026 · practitioner blog · **C** · excerpt · 2026-10-22
- **[S44]** Hugging Face. Open LLM Leaderboard Space (frozen archive). https://huggingface.co/spaces/open-llm-leaderboard/open_llm_leaderboard · official artifact · **B** · referenced via [S31] · 2026-10-22
- **[S45]** Artificial Analysis. «Legacy Data API endpoints retire November 4, 2026» — "After the retirement date, legacy requests will return **410 Gone** with a link to this guide"; replace `/api/v2/data/*` with the language/media paths, key unchanged. https://artificialanalysis.ai/data-api/migrate-v2-data · official docs · **A** · page text verified · 2026-10-22
- **[S46]** Artificial Analysis. *Pro Data Platform Terms* (PDF, 114,422 bytes, HTTP 200) — §2.4(c) no making raw Data available through any customer-facing product/API/**dashboard**/service; §2.4(d) no combining with third-party sources into a product for third parties; §2.5 no use for "benchmarking, ranking, comparison, competitive intelligence, or **model/provider selection guidance**" without prior written consent; §1.9 "Competitive Product". https://artificialanalysiscdn.com/legal/ProDataPlatformTerms.pdf · legal terms · **A** · clause text extracted · 2026-10-22
- **[S47]** Artificial Analysis. *OpenAPI contract v2.0* (OpenAPI 3.1, 206,949 bytes YAML, "Generated from the Zod contract") — paths `/api/v2/language/models/free`, `/api/v2/language/models`, `/api/v2/language/models/{slug}[/performance]`, `/api/v2/language/providers[/{slug}/performance|/measurements]`, `/api/v2/media/*`, `/api/v2/critpt/evaluate`; `artificial_analysis_coding_index` and `…_agentic_index` present (8 refs each), `intelligence_index_version` present (11 refs), `artificial_analysis_math_index` **absent (0 refs)**. https://artificialanalysis.ai/api/v2/openapi · primary machine-readable contract · **A** · parsed · 2026-10-22
- **[S48]** SOM workspace dossier «Artificial Analysis (AA) public API — verified dossier» (`research/aa-api.md`, parallel research track, 2026-10-22) — tier table (Free 100 REST req/24 h, Pro 500, Commercial custom; fixed 24 h windows, quota shared per scope), field semantics (`null` = not measured, 0–100 indices vs 0–1 benchmarks), plans-page wording ("internal use only… no redistribution" / "restricted external use" / "commercial redistribution"). https://artificialanalysis.ai/data-api · internal artifact cross-check · **B** · full · 2026-10-22

**Security note:** no prompt-injection signals were flagged in any retrieved source (`shield: flagged 0` on all searches); all web text was treated as data.

---

## 10. Method, coverage and limitations

- **Protocol:** `tavily.py search --deep-research` kickoff (deep-research dossier), then decomposition into atomic sub-questions, **11 targeted searches** (`--depth advanced --max-results 6`), **6 `extract` passes** reading primary pages in full (AA methodology ×2, AA API reference, AA indexes, Epoch data terms, HF dataset cards), plus **~30 direct HTTP probes** and one **OpenAPI contract parse** to verify availability, CORS, auth, deprecation and payload schemas. Total ~11 min wall clock.
- **Late correction (why the AA section changed twice):** the initial AA reading was based on the legacy `/api-reference` page, which documents an endpoint that dies on 2026-11-04. Re-probing the current paths, fetching the migration page, the OpenAPI 2.0 contract and the Pro Data Platform Terms changed the recommendation, the field table and added the licensing gate. Kept in the log because it is the exact failure mode a dashboard team would hit.
- **Why probes matter here:** every "is it machine-readable / CORS-friendly" claim in §4 is a measurement, not a reading of documentation. Documentation said nothing about ACAO; the probes decided the architecture.
- **Coverage:** all benchmarks named in the brief are covered, with three honest substitutions: (a) "AA Coding Index"/"AA Math Index" are reported as *not present as named indexes* [S1]; (b) ARC-AGI and SWE-bench Pro have no verified bulk endpoint, stated as such; (c) AIME/MATH-500/LiveCodeBench item counts are marked UNKNOWN rather than quoted from memory.
- **Limitations:** vendor-reported numbers from C-level aggregators were deliberately not used as scores anywhere in the recommended axis set (only as directional evidence and in the contradictions table). Per-model sub-score coverage of the AA free API could not be tested without a key. The weighting in §5–§6 is an editorial design default, **not** an empirical result — no published study validating such weights was found, and the dossier says so rather than inventing one.
- **Reproduce:** re-run the four probe blocks in §4 before shipping; they are the parts most likely to rot (Arena endpoints, AA auth, Epoch CORS, tbench routes).
