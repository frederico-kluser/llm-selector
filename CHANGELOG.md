# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2026-10-22

### Added

- **Vercel deployment.** `vercel.json` + five Node functions (`catalog`, `providers`, `account`,
  `benchmarks`, `health`) sharing one `api-core` with the local server; the SPA fallback excludes
  `/api/` so a bad endpoint 404s instead of returning HTML with 200.
- **Measured performance ("My model").** A streamed probe using the visitor's own OpenRouter key
  reports TTFT, output tokens/second, end-to-end latency, token counts and the exact billed cost —
  stored in the browser only, next to the published medians.
- **OpenRouter benchmark feed.** `/api/v1/benchmarks` proxied server-side (Artificial Analysis,
  Design Arena and OpenRouter task benchmarks) with OpenRouter's own citation and `as_of`.
- **Design Arena.** Elo, win rate and rank across 26 categories for 180 models, filterable by
  minimum Elo and expanded per category on the model card.
- **Automatic refresh.** The catalogue revalidates on load, when the tab regains focus and every
  five minutes; source and freshness stay visible.

### Changed

- Catalogue responses are CDN-cacheable only when built from the server's own key; a response
  personalised by a caller-supplied `x-aa-key` is `private`, because custom headers are not part of
  a cache key.

### Features
- deploy on Vercel with live refresh and measured performance ([e125d5e](https://github.com/frederico-kluser/llm-selector/commit/e125d5e))

### Build & CI
- **oss:** allow single-maintainer reviews (0 approvals) (#14) ([427584c](https://github.com/frederico-kluser/llm-selector/commit/427584c))
- **ci:** pin the remaining action references by SHA (#13) ([3ab86fe](https://github.com/frederico-kluser/llm-selector/commit/3ab86fe))

## [0.2.1] - 2026-10-22

### Added

  `benchmarks`, `health`) sharing one `api-core` with the local server; SPA fallback excludes `/api/`
  so a bad endpoint 404s instead of returning HTML with 200.

### Changed

- Catalogue responses are CDN-cacheable only when built from the server's own key; a response
  personalised by a caller-supplied `x-aa-key` is `private`, because custom headers are not part of
  a cache key.

### Bug Fixes
- **npm:** keep provenance in CI only and document publishing (#11) ([2bec208](https://github.com/frederico-kluser/llm-selector/commit/2bec208))

## [0.2.0] - 2026-10-22

### Features

- **npm package:** `npx llm-selector` runs the whole app locally from a 405 kB tarball — CLI bin,
  prepack build, runtime dependency on `express` only, and the catalogue snapshot deliberately
  excluded so no upstream data is redistributed.
- **npm:** publish the app as an installable CLI package ([3e73337](https://github.com/frederico-kluser/llm-selector/commit/3e73337))

### Bug Fixes
- stop tracking the TypeScript build info file (#8) ([847cb69](https://github.com/frederico-kluser/llm-selector/commit/847cb69))
- use the canonical MIT text so GitHub detects the licence (#6) ([f4af429](https://github.com/frederico-kluser/llm-selector/commit/f4af429))
- chart strip clipping, facet focusability and chip labels (#5) ([1573839](https://github.com/frederico-kluser/llm-selector/commit/1573839))

### Refactoring
- rename the product to LLM Selector (#7) ([8aeda9f](https://github.com/frederico-kluser/llm-selector/commit/8aeda9f))

### Documentation

- README "Publishing" section: local publish, trusted publishing (OIDC) and the `NPM_TOKEN`
  environment secret; CONTRIBUTING "Releasing" runbook follows the `opensource-project` gates.

### Fixed

- `publishConfig.provenance` removed: provenance is an OIDC-only feature, so inheriting it from the
  config made local `npm publish` fail with `EUSAGE`; CI now passes `--provenance` explicitly.
- document the accepted branch prefixes and ruleset-as-code (#4) ([aa0696d](https://github.com/frederico-kluser/llm-selector/commit/aa0696d))

### Changed

- The product is named **LLM Selector** (SOM is the system family it belongs to). The score is now
  the **fit score**, storage keys are namespaced `llm-selector.*`, and the JSON config records
  `app: "llm-selector"`.

### Accessibility & UI polish

- The model table scrolls horizontally below ~1374 px with a sticky model column, and switches to
  cards under `md` instead of clipping the SOM column.
- Scatter marks are keyboard focusable buttons with per-model `aria-label`s, wrapped in a
  `<figure>`/`<figcaption>`; the table below is the accessible equivalent.
- `--color-fg-dim` raised to #8a9099 (6.1:1) — eyebrows, table headers and axis ticks were failing
  WCAG 1.4.3.
- The weights facet no longer folds "unknown" into proprietary: counts and predicate now agree, and
  the unknown bucket is shown.
- **Text-only** is a real predicate (text in, text out, nothing else) instead of a no-op alias for
  "accepts text".
- Legend matches the encoding (filled = open, ring = proprietary, colour = lab, dot size = context)
  and the chart explains that floors exclude unscored models rather than scoring them zero.
- Single-value sliders use a single thumb; a no-op price drag no longer emits a phantom price chip.
- `-latest` aliases are hidden by default so they do not pollute the frontier, and the applied-filter
  strip is sticky with every chip removable.

## [0.1.0] — 2026-10-22

First public release.

### Added

- OpenRouter catalogue ingestion (460+ models) with pricing per 1M tokens, modalities, capabilities,
  context windows and variant detection (free / batch / alias / router).
- Artificial Analysis integration via the post-migration `language/models/free` tier with a legacy
  fallback, normalised to a single row shape. Fetched per user key, never committed.
- Join engine with four matching rungs (exact slug + index confirmation, slug, guarded similarity,
  reject) and a visible confidence level per match.
- 20+ filter facets with self-excluding counts: modality *all/any*, weights tri-state, log-mapped price
  range, cache price and discount, context floor, benchmark floors, capabilities, provider, recency,
  and variant visibility.
- SOM score: percentile blend of quality, cheapness, speed, context and cache savings, computed within
  the current result set with user-adjustable weights.
- Cost/quality scatter with log price axis, efficient-frontier overlay and collision-avoided labels;
  radar profile; ranking bars; virtualised sortable table.
- Named presets with curated starters, JSON export/import with a merge diff (new / updated / unchanged
  / invalid) and keep-both conflict handling.
- Readable URL serialisation of the whole view.
- Local BYOK API server (catalogue cache, Artificial Analysis proxy, live provider stats, account
  credits) plus a fully static fallback build.
- 33 unit tests covering filter semantics, scoring, joining, AA shape adapters and config round-trips.
