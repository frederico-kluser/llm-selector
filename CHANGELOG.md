# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The product is named **LLM Selector** (SOM is the system family it belongs to). The score is now
  the **fit score**, storage keys are namespaced `llm-selector.*`, and the JSON config records
  `app: "llm-selector"`.

### Fixed

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
