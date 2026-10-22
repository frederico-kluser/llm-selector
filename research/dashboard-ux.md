# SOM — LLM Selector · Interaction & visualization dossier

**Scope:** interaction design for a high-density model-comparison dashboard: faceted filtering over ~400 models, chart selection, dense tables, shareable presets, motion, and the details that make it feel premium.

**Method.** This is the synthesis of a deep-research pass (14 web searches + 6 full-text extraction passes over primary sources). Every factual claim about UX research or a third-party product carries a source marker `[S#]`; the marker resolves to a URL in §8. Where a recommendation is *engineering/design judgement* rather than a sourced finding, it is marked **(judgement)**. Per-section confidence is stated and reflects the strength and independence of the underlying sources (see §9 for the grading rule).

**How to read the numbers.** Spacing is on a 4 px grid, type on a 1 px scale, and all interactive dimensions are given for a 1280 px+ desktop then restated for mobile. Numbers are deliberate defaults, not laws: the sourced constraints are marked with `[S#]`, the rest are calibrations you can move ±20 %.

---

## 0. The layout to build

### 0.1 Shell (≥ 1280 px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ SOM · LLM SELECTOR     [ Filters & jump to…  ⌘K ]    [Preset ▾]  128/404  ⋯  │ 56px header, sticky
├──────────────────────────────────────────────────────────────────────────────┤
│ Sort: Intelligence ↓ │ Density: ▤ │ Columns ▾ │   ⟨Table⟩ ⟨Scatter⟩ ⟨Radar⟩    │ 48px toolbar, sticky
├──────────────────────────────────────────────────────────────────────────────┤
│ Price $0.10–$2.00 ×   Weights: Open ×   Context ≥ 128K ×        +2 more  Clear│ 40px applied strip
├───────────────┬──────────────────────────────────────────────────────────────┤
│ FILTERS  128  │  ┌────────────────────────────────────────────────────────┐  │
│ ─────────────  │  │ COST vs INTELLIGENCE          x: log  y: linear        │  │
│ Output        │  │        ·  ·   ●──────● efficient frontier              │  │
│ ☑ text   404  │  │   ·   ○     ·                                          │  │
│ ☐ image   38  │  └────────────────────────────────────────────────────────┘  │
│ ☐ audio    9  │  ┌──────────────────────────┐ ┌───────────────────────────┐  │
│ + Show 1 more │  │ CONTEXT vs PRICE (log/log)│ │ RANKING: intelligence     │  │
│ Weights       │  └──────────────────────────┘ └───────────────────────────┘  │
│ Price         │  ┌────────────────────────────────────────────────────────┐  │
│ Cache read    │  │ TABLE (virtualised, sticky header + sticky name column)│  │
│ Benchmarks    │  └────────────────────────────────────────────────────────┘  │
└───────────────┴──────────────────────────────────────────────────────────────┘
   288px fixed          compare tray (≤4 models) slides up from the bottom edge
   own scroll
```

| Token | Desktop ≥1280 | Tablet 1024–1279 | Mobile <640 |
|---|---|---|---|
| Filter panel | Fixed 288 px left column, own scroll, sticky | 264 px, collapsible to icon rail | Bottom sheet, 90 vh, 44 px targets [S4] |
| Header | 56 px | 56 px | 52 px |
| Toolbar | 48 px | 48 px | 44 px, horizontal scroll, sort-only |
| Applied strip | 40 px, max 2 rows then "+N more" popover | same | 1 row, horizontal scroll with truncation [S8] |
| Content gutter | 24 px | 20 px | 16 px |
| Grid | 12 col / 16 px gap | 8 col | 1 col |
| Default surface | Table | Table | Card list |

Design tokens: radius 4 px (chips) / 6 px (inputs, buttons) / 8 px (cards); hairline borders `1px` at 6–8 % foreground alpha instead of drop shadows; shadows only for overlays (popover, drawer, tooltip). Type: 11 / 12 / 13 / 14 / 16 / 20 / 24 px, body 14 px, dense UI 13 px, numeric cells 13 px with `font-variant-numeric: tabular-nums`. Focus ring 2 px accent + 2 px offset, ≥3:1 against adjacent colours [S32].

### 0.2 Why this shape

The three-zone shell is the only layout that satisfies four constraints simultaneously: facets scale vertically in a sidebar (the sidebar has low "page context" but high scalability, and it must therefore affect the entire data stage); applied filters stay visible in a horizontal overview above the results; the toolbar keeps sort/density/columns out of the facet list; and the command palette is an accelerator rather than a container for 20 facets. Sources: sidebar scalability and the requirement that it affect everything on the page [S5]; horizontal bars are good at showing selection but hide options when several facets are active [S3]; displaying applied filters in an overview is a validated benchmark behaviour and 20 % of sites fail it [S7][S8]; a horizontal bar alone forces users to reopen the panel to recall the filter state [S8].

**Confidence: high.** Two independent UX research bodies (NN/g, Baymard) plus practitioner pattern libraries converge; the only tension is bar-vs-sidebar, resolved by hybridising (see §1.5).

---

## 1. Faceted filter UX

### 1.1 Placement decision matrix

| Option | Best for | Breaks when | Verdict for SOM |
|---|---|---|---|
| Left sidebar | 5+ facets, ranges, long value lists; scales vertically [S5] | Page has elements that do not respond to filters — "affects the page as a whole" [S5] | **Primary.** 288 px, own scroll, sticky. |
| Horizontal filter bar | Few facets, high visibility of the current selection [S3] | Several active facets → must hide options and users lose the state [S3] | **Secondary.** Only for the applied-filter chips. |
| Inline dropdowns in a toolbar | Compact top bars; needs a dropdown per facet and the right input per data type [S5] | Long value lists, ranges | **Not for facets.** Reserve for sort and column config. |
| Command palette (⌘K) | Complex apps, many actions, power users, keyboard-first flows [S34][S35] | Discoverability; useless for users who do not know commands exist [S34] | **Accelerator only.** Never the only way to filter. |
| Bottom sheet / full-screen drawer | Mobile filters; single "Filter" button, 44 px targets, "Apply" with a count [S4] | Desktop (wastes space) | **Mobile only.** |

### 1.2 Eight-plus facets: tier them, do not flatten them

Three tiers, in this order, with per-user remembered open/closed state:

1. **Always open (the decision drivers):** Output modality · Weights (Any / Open / Proprietary) · Price (blended $/1M).
2. **Open but collapsible:** Cache read $/1M · Context window · Benchmark thresholds.
3. **Collapsed:** Provider · Family · Release date · Quantisation · Throughput · Latency · Tool/function support · Structured output · Reasoning mode.

Rules that come from the research rather than taste:

- **4–7 values visible per facet**, remainder behind "More choices" — and it is critical that the full value set is reachable somewhere when there is no "All/Any" that resets the facet [S1].
- **Search-within-facet** once a facet has >12 values (providers, families), plus "show top 5–10 then Show more"; a list of 200 values is useless [S4].
- **Facets must match user vocabulary.** Do not expose a facet merely because the data exists; NN/g documents filters that exist because of internal product lines and that users then misuse or ignore [S10]. Practical test for SOM: every facet must change a decision ("would I shortlist differently?"), otherwise it goes to tier 3 or is cut.
- **Predictability over cleverness.** A user must be able to guess what values live inside a category — this matters most on mobile accordions [S11]. So: no renamed "Capabilities" blob; use "Output modality", "Weights", "Context".

### 1.3 Selection semantics (the rule set to implement)

| Dimension | Control | Within-facet | Across facets | Notes |
|---|---|---|---|---|
| Output modality (multi-valued) | Checkbox list + "text only" shortcut | **OR** | AND | Model matches if *any* selected modality is in its output list. `text only` is a distinct predicate: `outputs == ["text"]`. |
| Weights | 3-state segmented (Any / Open / Proprietary) | n/a | AND | A checkbox cannot express "either", so it must be tri-state [S5]. "Any" is the default and must be visually distinct from "Open". |
| Price, cache read, context, throughput, score | Range (dual-thumb) | one predicate | AND | A range *is* a filter value, not a special case [S11]; two ranges on different axes intersect. |
| Provider / family | Multi-select + search | OR | AND | Stable ordering by count, then alphabetical. |
| Capability flags (tools, JSON, reasoning) | Checkbox | AND (all required) | AND | Deliberately different from modality: "supports tools" is a conjunction of one value. |
| Free models | Toggle | — | — | Price = 0 breaks log axes; handle separately (§2.5). |

- **Multi-select within a facet is mandatory.** Baymard's benchmark lists "always allow users to combine multiple filtering values of the same type" among its product-list guidelines precisely because 14 % of sites do not [S7].
- **OR inside, AND outside** is the canonical definition of faceted navigation: several filters, each about a different aspect, all applied [S9].
- **Missing-data policy must be explicit and visible.** If a benchmark threshold is active and a model has no score, it is excluded — but the UI must say so: `41 models have no score → Include them`. Silently dropping rows is the most common trust-destroying bug in comparison tools **(judgement)**.
- **Boolean facet tri-state** also applies to "has cache pricing": a model with no cache-read price is not "cheap cache"; it is unknown. Give it its own bucket rather than sorting as $0.

Reference implementation shape:

```ts
// Predicates are (model) => boolean. AND across facets, OR within a facet.
// `pricing.blended` in the catalogue is already a 3:1 input:output blend — do not re-derive it.
const PRICE_AXIS = "blended" as const; // offer "input" | "completion" as axis alternatives

const p = {
  modality: (m) => sel.length === 0 || sel.some(v => m.outputModalities.includes(v)),
  textOnly: (m) => !textOnly || (m.outputModalities.length === 1 && m.outputModalities[0] === 'text'),
  weights:  (m) => weights === 'any' || m.openWeights === (weights === 'open'),
  price:    (m) => m.blendedPrice != null && m.blendedPrice >= price[0] && m.blendedPrice <= price[1],
  cacheRead:(m) => m.cacheRead == null ? includeUnknownCache : m.cacheRead <= cacheMax,
  context:  (m) => m.context >= contextMin,
  scored:   (m) => includeUnscored || m.intelligence != null,
};
const matches = (m) => Object.values(p).every(f => f(m));
```

### 1.4 Faceted counts

- **Count every value on every state change**, never once at load. Algolia frames this as the mechanism that tells the user which is the shortest path to a result — with counts, the smaller facet is obviously the better first click [S3].
- **Self-exclusion semantics:** the count for value *v* of facet *f* = number of models matching all *other* active filters AND *v*. This is what makes counts legible ("if I add this, I get 38") and avoids the paradox where every selected value reads 0. *(This specific rule was not stated in any source found; it is engineering judgement built on the "shortest path" purpose [S3].)*
- **Zero-count values stay visible but dimmed** (opacity .38, still focusable, hover title "0 models with the current filters"). Hiding them removes the evidence that the *combination* is impossible rather than the *value* non-existent [S1][S7]. Exception: above 12 values, hide-zero behind a "Show unavailable" toggle, because long dead lists are worse than a missing row [S4].
- **Never collapse the applied state into a number.** "Filters: 3" is explicitly documented as an implementation that tested badly; show type + value [S8].
- **Cost of computing:** with ~400 models and ~12 facets, counts are 400 × 12 predicates ≈ 5 k comparisons — recompute synchronously in a `useMemo`. No worker, no debounce except on slider drag (see §1.6). Do not cache server-side; this catalogue is small enough to be pure client state.

### 1.5 Applied-filter strip (the part everyone gets wrong)

- 40 px tall, sits under the toolbar, sticky, max **2 rows** then `+N more` popover (applied filters commonly wrap to 2–3 lines; beyond that the page scroll becomes unpleasant [S5]).
- Each chip: `Facet: value ×`, 28 px tall, 8 px gap, label truncated at 180 px with full text in `title`; range chips read `Price $0.10–$2.00`.
- Always a `Clear all` at the end of the strip **and** in the panel header [S4].
- On mobile, a horizontally scrolling list with clear truncation of the non-visible chips, which tested well; stacking in rows is the accepted alternative [S8].
- Chip removal is one click, and removing the last chip must not reset sort/density — those belong to the view, not the filter.

### 1.6 Numeric ranges: the price slider

- **Dual-thumb range slider** is the right primitive: Material's range configuration is exactly "two handles selecting a range", with a discrete variant that adds marks for exact values [S33].
- **Log-mapped for price.** Prices span ~$0.01 to ~$100+/M — two-plus orders of magnitude — so linear mapping makes everything under $5 a single pixel cluster. Map thumb position *t* to `value = exp(ln(min) + t·(ln(max) − ln(min)))`.
- **Show the distribution.** Draw a 32 px histogram behind the track (bars at 4 % alpha, accent at 10 % for the selected span) so the user sees where the catalogue actually lives before dragging.
- **Snap to human ticks**: $0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 25, 50, 100.
- **Editable numeric fields** at both ends (72 px wide) — sliders alone cannot express "$1.13".
- **Live vs commit:** update chips and counts on drag (throttled to `requestAnimationFrame`); commit the URL and `aria-live` announcement on pointer-up. Announcing every drag frame is hostile to screen-reader users.
- **Cache-read facet** gets the same treatment but with an explicit `No cache pricing` bucket, because absence of a cache price is a real, common state.

### 1.7 Empty state: "0 models match" with a repair path

The research is unambiguous on *that* you need one — a totally empty state leaves users unsure whether the system is loading, errored, or filtered wrongly [S12]; use the *small* empty-state variant for no-results, with a short heading ("No results found") and a body that states the next action ("Adjust your filters and try again"), and do not repeat toolbars/filters inside a full-height empty state [S13]. It is also required to provide *direct pathways* to the corrective task, not just a status message [S12].

What no source prescribes is the diagnostic. The version worth building **(judgement)**:

```
No models match these filters
Remove one constraint to see results again.

  Price ≤ $0.50            removes 380 of 404    [Remove]
  Context ≥ 200K           removes  96 of 404    [Remove]
  Weights: open            removes  61 of 404    [Remove]

[ Remove price cap → 12 models ]   [ Clear all filters ]   [ Show nearest matches ]
```

- Rank constraints by *marginal removal count* (`count(all filters minus f)`), descending.
- The primary button names the fix and predicts the result — a direct pathway, not an instruction [S12].
- "Show nearest matches" relaxes the cheapest-to-relax numeric bound until ≥1 result appears (widen the price ceiling in one tick step; then lower the context floor) **(judgement)**.
- Never show a blank canvas: axis, header, and model count stay in place so the layout does not jump.

**Confidence: high** for the pattern, **low** for the diagnostic specifics (no source).

### 1.8 Command palette

- Trigger: ⌘K / Ctrl+K plus a visible button labelled `Filters & jump to…` with a kbd hint in the header. Palettes are a power-user accelerator and suffer from low discoverability, so the entry point must be visible [S34].
- Scope prefixes (the pattern Slack uses for per-type prefixes) [S35]: `@` model, `#` preset, `:` facet value, `>` action, plain text = fuzzy over everything.
- Contents: jump to model, apply saved preset, set a single facet value, toggle density/columns, copy link, export JSON.
- Layout: 640 px wide, top 15 vh, 44 px result rows, group headers 11 px uppercase, footer with `↑↓ navigate · ↵ select · esc close`.
- It **does not** replace the sidebar: a palette cannot show 40 values with counts, and it hides the current filter state.

**Confidence: moderate** (pattern sources are practitioner-level [S34][S35]).

---

## 2. Chart selection and specs

### 2.1 Decision table

| Question the user asks | Chart | Why | Confidence |
|---|---|---|---|
| "What do I get for the money?" | **Scatter**, price (log) × quality, size = context, fill = weights | Two-variable relationship; the canonical use of scatter [S15] | high |
| "Who is best on axis X?" | **Horizontal bars**, sorted, top 12 | Ranking with readable labels, zero baseline; bars are the named alternative to radar [S14][S15] | high |
| "How do these 3 models differ across benchmarks?" | **Radar, gated to ≤4 series × ≤8 axes**, normalized; bars toggle | Pattern/profile reading only [S14][S16]; lines between categorical axes are meaningless and the shape changes with axis order [S15] | high |
| "Is a big context window expensive?" | **Scatter**, context (log₂) × price (log₁₀) | Both dimensions span orders of magnitude | high |
| "Which model should I pick, period?" | Not a chart: **table sorted by score-per-dollar** | Tables are the honest alternative when precision matters [S14] | moderate |

### 2.2 Scatter (hero chart)

- Frame: min 420 px tall, grows to 560 px max, aspect capped at 16:9; plot area padding: left 56 px (tick labels), bottom 44 px (axis title), top 16 px, right 24 px.
- **X = blended price, log₁₀**, domain [0.01, 100], ticks at 0.01 / 0.1 / 1 / 10 / 100 labelled `$0.01 … $100`. **The axis title must read "Blended price, USD per 1M tokens (log scale)"** — annotating the log scale in the axis title is the recommended way to make it obvious [S17], and labelling each multiple of 10 is what makes the constant pixel interval mean "×10" [S17]. Put the unit in the title rather than repeating `$` on every tick [S19].
- **Y = intelligence index, linear 0–100**, ticks every 20, gridlines horizontal only at 8 % alpha.
- **Mark size = context window**, radius 4–10 px on a sqrt scale, with a 3-item size legend (8K / 128K / 1M) — otherwise size reads as noise.
- **Open vs proprietary = shape + fill**, never hue: open weights = filled disc (85 % alpha, no stroke); proprietary = 1.5 px ring with a 25 % fill. Colour never as the sole channel [S20]; this is the specific case where it matters most, because weights is the axis users actually decide on.
- **Pareto frontier overlay:** a 1.5 px dashed line joining the non-dominated models (no model is both cheaper and better), labelled once, `efficient frontier`. This is the single highest-value annotation in the whole app **(judgement)**, and it exploits what scatter does best: revealing relationships [S15].
- **Direct labels:** at most 8, 11 px, greedy collision avoidance (reject a label that overlaps a placed bbox), offset 6 px, suppressed while hovering.
- **Tooltip:** 260 px wide, ≤5 rows (name, blended $/1M, in/out, context, score, weights), 12 px pointer offset, 40 ms show delay / 0 ms hide, `role="tooltip"`, positioned to stay inside the plot; nearest-point hit testing with an 8 px radius and a crosshair. Never two tooltips at once.

### 2.3 Radar — gated, not forbidden

- **Enabled only with 2–4 selected models.** Beyond 4, the chart is replaced by a note: "Radar compares up to 4 models — switch to Bars". The permissive limit found in the literature is 3–4 entities across 5–7 related variables, with the explicit warning that differing scales make small values invisible [S16]; the harsher sources say radar should be avoided outright [S15].
- 6 fixed axes in fixed order: Intelligence · Coding · Math · Speed · Cost-efficiency · Long-context. Fixed order matters because a radar's shape changes when categories are reordered [S15].
- All axes normalized to 0–100 percentiles **within the current filtered set**, with the normalization stated in the caption.
- Series: ≤4 colours from the categorical palette plus distinct dash patterns (solid / 6-4 / 2-3 / 10-4), vertex dots 3 px, 20 % fill alpha.
- Rings at 25/50/75/100 at 8 % alpha; axis labels 11 px outside the outermost ring; no radial tick labels (they add nothing at 6 axes).
- A `Bars` toggle in the card header renders the same six metrics as horizontal small multiples — the named substitute when precision is needed [S14][S15].
- Radar is **never** the default view and never persists in a preset with >4 models: on load, fall back to Bars with a one-line notice.

### 2.4 Bars and rankings

- Horizontal, sorted descending, **top 12 + "Other"** rather than 400 bars.
- Bar 24 px tall, 8 px gap; value label right-aligned at the bar end, 12 px tabular; **baseline always 0** (truncated bar axes misrepresent ratios) [S19].
- One metric per chart with a metric selector; grouped bars max 4 series.
- Sort direction is a prop, not an animation: reordering bars re-sorts positions, it does not re-grow from zero (see §5).

### 2.5 Log-scale rules (and the free-model trap)

- Log is legitimate **only** for price/per-token dimensions; never for scores, percentages, ranks, or counts.
- Every log axis carries the words "log scale" in its title [S17]; when the range spans ≥3 orders of magnitude, tick labels at each power of 10 [S17]; when ticks fall below 1, label as ratios (`1/4`, not `0.25`) to keep the axis readable [S18].
- Add faint intermediate gridlines so the *compression* at the top is visible — this is what signals a log axis to a reader who did not read the title [S17].
- **Free models (price = 0) cannot be plotted on a log axis.** Do not silently clamp them to the minimum (that lies about the price). Draw them in a separate 28 px "Free" strip above the plot with a distinct glyph, and exclude them from the Pareto computation with a footnote.
- Offer a linear/log toggle per axis (persisted in the preset) and update the axis title when it flips.

**Confidence: high** for log-axis annotation and radar limits; **moderate** for the tick-ratio guidance [S18] and the free-model handling (judgement).

### 2.6 Colour system

Categorical palette, fixed order, 8 colours (Okabe–Ito, as reproduced with hex values) [S40]:

`#0072B2` blue · `#E69F00` orange · `#009E73` green · `#D55E00` vermilion · `#CC79A7` reddish purple · `#56B4E9` sky · `#F0E442` yellow · `#000000` ink

- Families get colours by **stable hash** of the family name so a family keeps its colour across charts and sessions; maximum 6 families + neutral grey "Other". More than ~8 categories stops being distinguishable even in a colourblind-safe palette [S38].
- **Weights are never encoded by hue** — shape, fill, and a lock/unlock glyph.
- Yellow is fill-only, never text or a 1 px line (contrast).
- Test the palette under deuteranopia/protanopia simulation, and remember that colour perception varies person to person, so simulation is a floor rather than a guarantee [S38].
- Keep secondary series desaturated so the primary comparison wins; a categorical palette needs a deliberate "importance ladder" rather than equal loudness [S39].
- Non-colour channels everywhere: direct labels, shape, dash pattern, ordering, and an accessible table [S20].

### 2.7 Chart accessibility

- Wrap charts in `<figure>` with a `<figcaption>` that states the finding, not the encoding ("Open-weight models cluster below $2/1M at 60+ intelligence").
- Every chart card has a `View as table` toggle that swaps the SVG for a real `<table>` — the documented non-colour alternative [S20].
- Keyboard: chart is `tabindex="0"` with roving focus over marks; ←/→ move between points sorted by x, Home/End jump, ↵ pins to the compare tray; a polite live region announces "Model X, $1.20 per million, score 62".
- Mark boundaries and focus states need ≥3:1 contrast against adjacent colours [S32]; axis labels ≥4.5:1.
- If a chart needs more than ~40 marks with labels, it is the wrong chart — the guidance is to split or change type when a visualization gets overly complex [S20]. This is the argument for filtering *before* plotting.

**Confidence: high.**

---

## 3. Table design for 400+ rows

### 3.1 Structure

- **Default density 40 px rows**; ladder 24 / 32 / 40 / 48 px (Carbon's extra-small → large) [S24]. The header row always matches the row height [S24], and 48 px is only for two-line cells [S24].
- **Sticky header** (and sticky first column, 240 px, with a 1 px shadow when scrolled horizontally). Sticky headers exist so users never lose column context when they scroll past the first screen [S25]; fixed headers, horizontal scroll, resizable columns and density are the standard battery of large-table patterns [S26].
- **Virtualise above ~150 rows** (overscan 8 rows). Render only what is visible; that is what keeps a long list seamless [S25]. 400 rows is trivial for a windowed list and does not need server pagination — one fetch of the catalogue, client-side filter/sort.
- **No zebra striping.** At 400 rows it is noise; use 1 px row dividers at 6 % alpha and a 4 % hover tint.
- **Column count is the real density lever.** 9 columns by default, 12 max; everything else behind the Columns popover.

Default columns:

| # | Column | Width | Align | Format |
|---|---|---|---|---|
| 1 | Model (logo 16 px + name + provider 11 px) | 240 px, sticky | left | — |
| 2 | Output modality | 88 px | left | 3 glyphs, 14 px, with `title` |
| 3 | Weights | 72 px | left | badge: `Open` (solid) / `API` (outline) + lock glyph |
| 4 | Context | 80 px | right | `128K` / `1M` |
| 5 | In $/1M | 80 px | right | `$0.27` |
| 6 | Out $/1M | 80 px | right | `$1.10` |
| 7 | Cache read $/1M | 96 px | right | `$0.07` or `—` |
| 8 | Intelligence | 96 px | right | number + 48 px mini bar (normalized to the filtered set) |
| 9 | Speed (t/s) | 72 px | right | `142` |

- **Numeric formatting discipline:** 3 significant digits, `<$0.01` for anything smaller, `—` with `title="Not published by this provider"` for missing, tabular numerals, and **units in the header** (`$/1M ↑`), never repeated per cell [S19].
- **Sorting:** click cycles asc → desc → none; shift-click adds a secondary sort with a small priority numeral in the header (1, 2, 3); the active column shows ↑/↓. Default sort: intelligence desc, tie-break on blended price asc.
- **Column config:** popover with drag-to-reorder, pin-left, and per-column visibility grouped as *Identity / Pricing / Capability / Ops*. Persisted in the preset (§4).
- **Row interaction:** whole row is a link to the model; checkbox column appears only in compare mode (max 4); focus-visible ring on the row; the pinned baseline row gets a 2 px left accent.

### 3.2 Loading, errors, and the "no layout shift" rule

- The skeleton is the real geometry: 6 rows × 9 columns at the current density, same widths, 1.2 s shimmer *maximum* then static.
- Rendering time is a UX failure, not an aesthetic one — users read a 4 s table as a broken page [S25]. Target: first paint of the table shell < 100 ms, rows < 300 ms; filter application must feel instantaneous because it is client-side.

### 3.3 Mobile fallback (< 640 px)

- **Cards, not a table.** 96 px card: name + provider line, a 2×2 metric grid (In/Out/Context/Score), and chips for modality + weights.
- Sort control sticky at the top (44 px tall), showing the active key.
- **Filters in a bottom sheet at 90 vh**, opening from a `Filters (3)` button that sits above the list; 44 px minimum touch targets; an `Apply` button whose label carries the count (`Show 128 results`); the current selection stays visible before applying [S4].
- Card list virtualises with the same windowing hook — do not build a second rendering path.

**Confidence: high** for density, sticky headers and virtualisation [S24][S25][S26]; **moderate** for curated column widths and mobile card specifics (judgement).

---

## 4. Saved presets, URLs, and import/export

### 4.1 What a preset contains

```ts
type Preset = {
  id: string;                 // nanoid(10)
  name: string;               // ≤ 40 chars
  createdAt: string; updatedAt: string;
  v: 1;                       // schema version
  filters: {
    modality?: ('text'|'image'|'audio'|'video')[];
    textOnly?: boolean;
    weights?: 'any'|'open'|'closed';
    price?: { min: number; max: number };        // blended $/1M
    cacheReadMax?: number | 'unknown';
    contextMin?: number;
    benchmarks?: { axis: string; min: number }[];
    includeUnscored?: boolean;
  };
  sort: { key: string; dir: 'asc'|'desc' }[];
  columns: string[];
  density: 'ultra'|'compact'|'default'|'comfortable';
  view: 'table'|'scatter'|'bars'|'radar';
  compare?: string[];         // ≤ 4 model slugs
};
```

### 4.2 URL state: human-readable first, compressed only as a fallback

Redundancy is the design goal: a URL a human can read is a URL a human can debug, diff, and paste into an issue.

```
/models?v=1&m=text,image&w=open&p=0.1-2&cx=128k&b=iq:60&s=iq.desc,price.asc&c=name,in,out&d=c
```

- **Short, stable keys** in a canonical order (`v m w p cx cr b s c d cmp`), arrays comma-separated, ranges `min-max`, context with `k/M` suffixes. Omit every default so the empty state is `?v=1` — or no query at all.
- **`replaceState` on filter change (debounced 300 ms), `pushState` only on preset switch or compare add**, and a `popstate` listener that restores state so the Back button works. Deep-linkability is the whole point of URL state.
- **Overflow fallback:** past ~1800 characters, move the payload into `#z=` as gzip → URL-safe Base64 of the minimal JSON — the documented pipeline for filter state (serialize → JSON → gzip → URL-safe Base64) [S29]. Show a subtle "long link shortened" note.
- **If it still exceeds ~4000 chars, stop encoding**: store the preset and share a short reference id instead, which is what "saved view" products do once the URL gets too long [S30].
- Never put API keys, model lists over 4, or ephemeral UI state in the URL. Keys stay in memory/session (§7.4).

### 4.3 Naming

- A generated label from the active facets, Title Case, ≤ 40 chars: `Open text ≤ $2, 128K+`.
- The name field is prefilled with it, never empty-blocking: saving with a blank name uses the generated one.
- Uniqueness enforced with a numeric suffix (`Open budget (2)`), matched case-insensitively.
- Dirty state = a 6 px dot next to the preset name, plus an explicit `Save` (update) vs `Save as new…` (⌘⇧S) choice. Never autosave over a named preset; *do* keep a separate "last session state" for reload continuity.

### 4.4 Export / import

- **Export:** a single JSON file `som-presets-YYYYMMDD.json`, `application/json`, `{ v: 1, app: "som", exportedAt, presets: Preset[] }`, plus `Copy JSON`. Export/import of dashboard configuration as a portable JSON is the established pattern in mature dashboard tools — Grafana's export contains layout, variables, styles, data sources and queries precisely so it can be re-imported elsewhere [S27], and Kibana exports NDJSON to move objects between instances [S28].
- **Import:** file picker + drag-drop + paste. Validate with a schema (zod); on failure, show *which* field failed and import nothing rather than partially.
- **Conflict resolution is a merge, never a replace (judgement — no source prescribes this):**
  - Diff the incoming set against local by `id` (fallback: `name` + `filters` hash).
  - Group the result: **New (n)** · **Updates (n)** · **Unchanged (n)** · **Not supported by this version (n)**.
  - One radio group, applied to all conflicts, with a per-row override: **Keep both (duplicate the incoming with `(imported)`)** · **Replace mine** · **Keep mine**. Default = Keep both.
  - Preserve unknown keys in a `_ext` object and re-emit them on export, so a file from a newer version survives a round trip through an older one.
  - Toast the outcome (`3 added · 1 conflict kept both`); never a silent overwrite.
- **Curated starter presets** (read-only, 4–6): *Cheapest capable text*, *Open weights only*, *Long context ≥ 1M*, *Image & audio generation*, *Best coding per dollar*. This mirrors how OpenRouter ships "popular comparisons" — curated triples such as "Best for code" or "Most affordable" alongside free-form comparison URLs [S37].

### 4.5 What comparable products actually do (verified)

| Product | Modelling observed | Takeaway for SOM |
|---|---|---|
| **OpenRouter** | Compare lives at a slug path per model triple (`/compare/{vendor}/{model}/…`) with curated "popular comparisons" groups (Flagship / Best for code / Most affordable / Image generation) [S37]. Its Models API takes `output_modalities` as a comma list or `"all"` and defaults to text-output models only [S31]. | Encode the comparison in the URL path or query; ship curated presets; treat modality as a list with an explicit text default. |
| **Artificial Analysis** | Compares across intelligence, pricing, output speed, latency, end-to-end response time and context window, measured with standardized prompts over 272 models — 132 evaluated, of which 65 open weights [S36]. | Ship a small, fixed metric set with definitions on hover; state coverage counts ("65 of 132 open weights") — it builds trust in the numbers. |
| **Grafana / Kibana** | JSON (Grafana) and NDJSON (Kibana) export of full dashboard objects for re-import and migration [S27][S28]. | JSON import/export is table stakes; version it and validate it. |
| **LMSYS Arena / Vercel AI Gateway** | **Not verified in this pass** (no primary source read). | Do not claim parity; re-check before writing copy about them. |

**Confidence: high** for OpenRouter/AA/Grafana mechanics (primary docs and product pages); **low** for conflict-resolution UX (inference).

---

## 5. Motion

Motion's job in a data dashboard is **object constancy**: the dot that was "Claude X at $3" should visibly become "Claude X at $2.40" rather than being replaced. Anything that does not serve that is decoration and costs comprehension.

### 5.1 Tokens

| Token | Value | Used for |
|---|---|---|
| `--dur-1` | 120 ms | hover, press, chip add/remove, row enter/exit |
| `--dur-2` | 200 ms | accordion, popover, tooltip-to-panel |
| `--dur-3` | 300 ms | chart rescale, drawer, view switch |
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | entrances, morphs |
| `--ease-inout` | `cubic-bezier(.4,0,.2,1)` | reorder, accordion |

### 5.2 Animate

1. **Chart marks morph** when filters change: position + opacity, 300 ms, uniform (no stagger) — preserves identity across states.
2. **Bar reorder** by FLIP, 120 ms; bar *length* changes on 300 ms but only after the first render.
3. **Row reorder / enter / exit** 120 ms opacity, no height animation.
4. **Chips** 120 ms: scale .96 → 1 + opacity. Remove: 100 ms opacity out, then layout.
5. **Accordion** 200 ms max-height + opacity; chevron rotate 200 ms.
6. **Tooltip** 80 ms opacity only — never scale or slide (it lags the cursor).
7. **Mobile sheet** 250 ms translate-Y, scrim 200 ms opacity.
8. **Value change feedback**: a 120 ms background flash at 8 % accent on the changed cell instead of odometer/rolling digits (rolling digits are slower to read and imply ongoing computation).

### 5.3 Never animate

- **Table row heights or column widths** — reflow fights the pointer and looks broken.
- **An axis domain change without moving the marks** — the data appears to change magnitude when only the scale did.
- **Bars growing from zero on every filter change** — a bar's length re-animating reads as new data.
- **Staggered entrance of 400 rows** — it is a loading spinner wearing a costume.
- **Infinite shimmer / looping skeletons** beyond ~1.2 s.
- **Auto-play chart animations on scroll** into view.
- **Anything that moves a target the user is about to click** immediately after applying a filter. Apply the layout change instantly; animate only the marks, not the chrome.
- **Parallax, background gradients that drift, hover-tilt on cards.**

### 5.4 Reduced motion

- Respect the system preference. `prefers-reduced-motion` detects a device setting asking to remove or reduce non-essential motion, and such animation can cause discomfort for people with vestibular disorders — scaling or panning large objects is a specific trigger [S22].
- Technical floor: under `reduce`, clamp animation/transition durations to ~1 ms globally [S21].
- Product-level: also expose an in-app `Reduce motion` control (System / On / Off) — the guidance is to let users turn off distracting animation rather than relying on the OS switch alone [S20], and WCAG 2.3.3 covers animation from interactions [S23].
- With reduced motion on, marks **snap** to their new positions and cross-fade at ≤150 ms opacity; no transforms, no scaling, no drawer slide (use a fade).

**Confidence: high.**

---

## 6. Ten signature elements (ranked)

Ranked by *insight delivered per engineering day*, with the reason each one reads as premium rather than generic.

1. **Pareto efficient-frontier overlay on the cost/quality scatter.** Joins the non-dominated models with one dashed line labelled `efficient frontier`, so the answer to "what's the best deal" is visible before any reading. Premium because it is an *opinionated analytic*, not a plotted dataset — generic tools never compute anything for you.
2. **Log-mapped price slider with the catalogue's histogram behind the track.** Shows where the market actually clusters ($1–$3/M) instead of pretending the axis is uniform. Premium because the control teaches the distribution while you drag it.
3. **"Why is it empty" diagnostic.** Ranks active constraints by how many models they removed, with a one-click removal and a predicted result count. Premium because it turns a dead end into a next step, and almost no catalog product names the culprit.
4. **Compare tray (≤4) with a gated radar and a bars fallback.** Pin models from table, scatter or palette into a persistent tray below the viewport; the tray is encoded in the URL and feeds radar/bars/diff. Premium because comparison becomes a *place*, not a mode.
5. **Truthful unit system.** `$/1M ↑` in headers, a blended-price definition popover (input/output weighting), `—` for unpublished prices with a tooltip, and 3-significant-digit formatting. Premium because a price table that never lies about what its numbers mean signals domain expertise more than any illustration.
6. **Cache-read savings pill.** Live-computed: "cache read is 90 % cheaper than input" inline in the price column, with the multiplier only shown when the provider publishes both numbers. Premium because caching is where model bills actually differ, and it is invisible in every competitor's table.
7. **Density ladder + column configurator persisted in the preset.** 24/32/40/48 px rows, 12 columns max, drag-reorder, and a saved layout — with **no layout shift** when switching. Premium because it treats the table as a *workbench* the user owns.
8. **Command palette with scope sigils and a visible trigger.** `@model`, `#preset`, `:facet`, `>` action, with a labelled `Filters & jump to… ⌘K` button in the header. Premium because keyboard-first flow implies the tool is meant for daily use.
9. **Baseline-diff mode in the table.** Pin one model as baseline; every other row shows `+12 %` / `−8 %` in subtly tinted cells against it. Premium because it converts a catalogue into a decision, and because tinting *only* the delta column is a restraint most dashboards lack.
10. **Link-first sharing.** Canonical readable query string, `Copy link`, curated starter presets, conflict-safe JSON import with a diff dialog, and a compressed fallback when the link gets long. Premium because "the state is a URL" is the quiet promise of every tool developers respect.

Honourable mentions (cheap, high leverage): hairline separators at 6 % alpha instead of boxed cards; skeletons that copy the final geometry; `tabular-nums` everywhere; a 2 px focus ring with 2 px offset; and empty-state copy that names the domain ("No open-weight model has a 2M context yet") instead of "No results".

---

## 7. Implementation notes and pitfalls

### 7.1 State model

One reducer owning `{ filters, sort, columns, density, view, compare }`. The URL is a *serialization* of that object, not a second source of truth: parse on mount, subscribe to `popstate`, write back debounced. Presets are immutable snapshots of the same object. This keeps "share a link", "save a preset", and "export JSON" as three encodings of one type instead of three features.

### 7.2 Performance budget

- Catalogue fetch: 400 models × ~25 fields ≈ 200 KB JSON — one request, cached, no pagination.
- Filter + count recompute: < 8 ms for 12 facets (5 k predicate calls).
- Table: windowed, ≤ 30 DOM rows; scroll target 60 fps at 40 px rows.
- Charts: ≤ 400 marks is fine in SVG until you add labels; above ~150 visible marks switch to canvas or aggregate into hex/beeswarm cells **(judgement)**.
- Charts must not re-render on every slider frame: throttle chart data to `requestAnimationFrame` and animate between two states, not 60 states.

### 7.3 Do-not-do list

- Do not hide the filter count behind a modal on desktop.
- Do not put filters in a wizard or a "search" page.
- Do not make the radar the default view.
- Do not use red/green as the only encoding for price deltas (colour-vision and cultural safety).
- Do not sort missing prices as `$0`.
- Do not auto-apply a "recommended" preset on first load; start unfiltered and show all 404.
- Do not animate the whole dashboard on filter change.

### 7.4 Security/privacy (short, but decide it now)

API keys (OpenRouter, Artificial Analysis) stay in memory or `sessionStorage` at most, never in the URL, never in an exported preset JSON, and never in a shared link. Any "export config" action must strip credentials by construction — whitelist fields on export rather than blacklisting secrets.

### 7.5 Mapping to the schema already in `src/lib/types.ts`

The catalogue types exist; these are the UX consequences of each field that are easy to get wrong.

| Schema field | UX rule |
|---|---|
| `pricing.blended` (3:1 blend) | Use it as the default price axis and *say* "3:1 input:output blend" in the axis/column tooltip; offer `prompt` / `completion` as axis alternatives rather than recomputing blends in the UI. |
| `pricing.cacheRead` + `cacheDiscountPct` | Drives the cache pill (§6.6) directly: when `cacheDiscountPct` is non-null show "−N % on cache hits"; when null, show `—` with "provider publishes no cache price", and **never** sort it as $0. |
| `openness: "open" \| "closed" \| "unknown"` | The facet is a 3-way control (Any / Open / Proprietary) but the *data* has three states. Do not fold `unknown` into either side: surface `N models with unknown openness` in the empty state and as a subtle row badge. Baymard-style trust reasoning: a user who cannot tell why a model disappeared stops trusting the filter set. |
| `variant: "free" \| "batch" \| "alias" \| "router"` | `alias` and `router` entries are not distinct models — exclude them from the scatter and radar by default (and from counts) or dedupe by `cleanId`, otherwise the catalogue looks larger than it is and the frontier gets polluted with duplicates. `free` and `batch` are *pricing variants*: keep them in the table, but plot only `standard` unless the user opts in. |
| `modalities.output` incl. `"embeddings"` | `text only` must be `output.length === 1 && output[0] === "text"`; embeddings models are not text generators and belong behind their own modality value, not in the text default. |
| `benchmarks.*` + `BenchmarkDef.coverage` | Render coverage inline (`Coding · 182 models scored`) and gate benchmark facets on it; a threshold slider over an axis with 40 % coverage silently deletes 60 % of the catalogue. Show `N models unscored → include`. |
| `contextLength` / `maxOutputTokens` | Log₂ ticks (8K / 32K / 128K / 1M / 2M); surface `maxOutputTokens` in the tooltip, not as a second axis. |

---

## 8. Sources

| ID | Source | URL | Type | Level | Read |
|---|---|---|---|---|---|
| S1 | Nudelman, "Best Practices for Designing Faceted Search Filters", UXmatters (2009) | https://www.uxmatters.com/mt/archives/2009/09/best-practices-for-designing-faceted-search-filters.php | practitioner article | C | excerpts |
| S2 | "A Guide to Navigation Elements: Filter vs. Facet", UXtweak (2023) | https://blog.uxtweak.com/filter-vs-facet | blog | C | excerpts |
| S3 | "Search Filters: 5 best practices for a great UX", Algolia (2024) | https://www.algolia.com/blog/ux/search-filter-ux-best-practices | vendor engineering blog | C | excerpts |
| S4 | "Faceted Search Best Practices for E-commerce", Broken Rubik (2026) | https://www.brokenrubik.com/blog/faceted-search-best-practices | blog | C | full |
| S5 | "Filter UX Design Patterns & Best Practices", Pencil & Paper (2026) | https://www.pencilandpaper.io/articles/ux-pattern-analysis-enterprise-filtering | practitioner research | C | full |
| S6 | "Designing better advanced search UIs", LogRocket (2025) | https://blog.logrocket.com/ux-design/advanced-ux-search-principles | technical blog | C | excerpts |
| S7 | Baymard Institute, "Product List UX Best Practices 2025 — Current State of Product List & Filtering" | https://baymard.com/research-articles/current-state-product-list-and-filtering | institutional benchmark | B | excerpts |
| S8 | Baymard Institute, "Filtering UX: Display Applied Filters in an Overview" | https://baymard.com/research-articles/how-to-design-applied-filters | institutional benchmark | B | full |
| S9 | NN/g, "Filters vs. Facets: Definitions" | https://www.nngroup.com/articles/filters-vs-facets | institutional research | A | full |
| S10 | NN/g, "User Intent Affects Filter Design" | https://www.nngroup.com/articles/applying-filters | institutional research | A | excerpts |
| S11 | NN/g, "Helpful Filter Categories and Values for Better UX" | https://www.nngroup.com/articles/filter-categories-values | institutional research | A | full |
| S12 | NN/g, "Designing Empty States in Complex Applications: 3 Guidelines" | https://www.nngroup.com/articles/empty-state-interface-design | institutional research | A | full |
| S13 | PatternFly, "Empty state — design guidelines" | https://www.patternfly.org/components/empty-state/design-guidelines | design-system docs | A | full |
| S14 | "A Critique of Radar Charts", Scott Logic (2011) | https://blog.scottlogic.com/2011/09/23/a-critique-of-radar-charts.html | technical blog | C | excerpts |
| S15 | "Why you should avoid radar charts", Observable (2025) | https://old.observablehq.com/blog/avoid-radar-charts | engineering blog | B | full |
| S16 | Deckary, "Radar Charts: When They Work and When to Use Alternatives" | https://deckary.com/blog/radar-chart-powerpoint | blog | C | excerpts |
| S17 | data.europa.eu, "Logarithmic scales" | https://data.europa.eu/apps/data-visualisation-guide/logarithmic-scales | official EU guide | A | full |
| S18 | Royal Statistical Society, "Principles and elements of visualisations" | https://royal-statistical-society.github.io/datavisguide/docs/principles.html | institutional guide | A | excerpts |
| S19 | Yellowfin BI, "Chart Axis Best Practices" | https://www.yellowfinbi.com/best-practice-guide/charts-visualizations/chart-axis-best-practices | product docs | C | excerpts |
| S20 | Highcharts, "10 Guidelines for DataViz Accessibility" | https://www.highcharts.com/article/10-guidelines-for-dataviz-accessibility | engineering article | C | full |
| S21 | web.dev, "prefers-reduced-motion: Sometimes less movement is more" | https://web.dev/articles/prefers-reduced-motion | official docs | A | excerpts |
| S22 | MDN, "prefers-reduced-motion — CSS" | https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-motion | official docs | A | excerpts |
| S23 | Esri, "Supporting Reduced Motion: Enhancing Accessibility in Web Apps" | https://www.esri.com/arcgis-blog/products/js-api-arcgis/mapping/supporting-reduced-motion-enhancing-accessibility-in-web-apps | official engineering blog | B | excerpts |
| S24 | Carbon Design System, "Data table" | https://www.carbondesignsystem.com/building-blocks/core/components/data-table | design-system docs | A | excerpts |
| S25 | Ninja Tables, "Big Data Table Design: A UX Guide" | https://ninjatables.com/big-data-table-design | product blog | C | excerpts |
| S26 | S. Walter, "Enterprise UX: essential resources to design complex data tables" | https://stephaniewalter.design/blog/essential-resources-design-complex-data-tables | practitioner | C | excerpts |
| S27 | Grafana, "Share dashboards and panels" | https://grafana.com/docs/grafana/latest/visualizations/dashboards/share-dashboards-panels | official docs | A | excerpts |
| S28 | Elastic, "Share and export dashboards" | https://www.elastic.co/docs/explore-analyze/dashboards/sharing | official docs | A | excerpts |
| S29 | Atoti Hub, "Share dashboards with URL filters" | https://docs.activeviam.com/data-visualization/atoti-ui/5.2/developer-guide/share-dashboards-with-url-filters | official docs | B | excerpts |
| S30 | Geo Dashboard, "Dashboard State & URL Sharing" | https://www.geo-dashboard.com/python-to-web-generation-workflows/dashboard-state-and-url-sharing | technical docs | C | excerpts |
| S31 | OpenRouter, "Models — API Overview" | https://openrouter.ai/docs/guides/overview/models | official API docs | A | full |
| S32 | W3C, "WCAG 2.2 Understanding SC 1.4.11: Non-text Contrast" | https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html | standard | A | excerpts |
| S33 | Material Design, "Sliders" | https://m2.material.io/components/sliders | design-system docs | A | excerpts |
| S34 | "Command Palette Pattern", UX Patterns for Developers | https://uxpatterns.dev/patterns/advanced/command-palette | pattern reference | C | excerpts |
| S35 | Setproduct, "Command Palette UI Design, 8 States and 10 Teardowns" | https://www.setproduct.com/blog/command-palette-ui-design-guide | blog | C | excerpts |
| S36 | Artificial Analysis, "Comparison of AI Models across Intelligence, Performance, and Price" | https://artificialanalysis.ai/models | primary product | B | excerpts |
| S37 | OpenRouter, "AI Model Comparison" | https://openrouter.ai/compare | primary product | B | full |
| S38 | Datylon, "The best charts for color blind viewers" | https://www.datylon.com/blog/data-visualization-for-colorblind-readers | blog | C | excerpts |
| S39 | Carbon Design (Medium), "Color palettes and accessibility features for data visualization" | https://medium.com/carbondesign/color-palettes-and-accessibility-features-for-data-visualization-7869f4874fca | official blog | B | excerpts |
| S40 | WebYES, "Color Blindness Accessibility — The Complete Guide" (reproduces Okabe–Ito / Wilke Table 19.1) | https://www.webyes.com/blogs/color-blindness-accessibility | blog | C | excerpts |

Note on S40: the eight hex values were confirmed on this page, which reproduces Wilke's *Fundamentals of Data Visualization*; the primary Okabe & Ito (2008) paper was not fetched, so treat the palette as corroborated-by-secondary rather than primary-verified.

---

## 9. Confidence summary

Grading: **high** = ≥2 independent A/B sources agreeing, no material contradiction; **moderate** = 1 A/B source with C corroboration, or minor inconsistencies; **low** = single C/D source or explicit engineering inference.

| Section | Confidence | Basis |
|---|---|---|
| 0. Layout | high | NN/g + Baymard + practitioner libraries agree on sidebar/hybrid |
| 1.1–1.3 Filters & semantics | high | [S5][S7][S9][S11] independent |
| 1.4 Counts | moderate | [S3] single source for "shortest path"; self-exclusion is judgement |
| 1.5 Applied strip | high | [S7][S8] benchmark data, two articles |
| 1.6 Range slider / log mapping | high (primitive) / moderate (log mapping calibration) | [S33] for range; mapping maths is judgement |
| 1.7 Empty state | high (need) / low (diagnostic) | [S12][S13] prescribe a next step, not a culprit ranking |
| 1.8 Command palette | moderate | practitioner sources [S34][S35] |
| 2.1–2.2 Chart choice & scatter | high | [S15] plus axis guidance [S17][S19] |
| 2.3 Radar limits | high | three independent critics [S14][S15][S16] |
| 2.5 Log axes | high | [S17][S18]; free-model handling is judgement |
| 2.6 Colour | moderate | palette via secondary source [S40]; shape/dash rule [S20] |
| 3. Table | high (density/sticky/virtualisation) / moderate (column widths) | [S24][S25][S26] |
| 4. Presets/URL/JSON | high (mechanisms) / low (conflict UX) | [S27][S28][S29][S30] verified; conflict policy inventing |
| 5. Motion | high | [S20][S21][S22][S23] |
| 6. Signature elements | low (by nature) | design judgement built on the sourced constraints |

**Known gaps.** No primary source prescribes conflict resolution for config import, filter-count self-exclusion, or empty-state diagnostics — those are marked judgement throughout. LMSYS Chatbot Arena and Vercel AI Gateway were not verified and are deliberately not described. No user testing was conducted; all recommendations are evidence-informed defaults that should be validated with 5 users on the empty-state repair path and the 400-row table's mobile fallback first.
