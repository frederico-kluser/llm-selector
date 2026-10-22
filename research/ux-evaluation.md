# SOM — LLM Selector · UX/UI evaluation

**Evaluated:** the shipped interface at `docs/screenshot.jpg` (1600×1000, Explore view, default state) plus the implementation in `src/App.tsx`, `src/components/filters/FilterRail.tsx`, `src/components/model/ModelTable.tsx`, `src/components/charts/Scatter.tsx`, `src/components/charts/Charts.tsx`, `src/components/views.tsx`, `src/components/KeyDialog.tsx`, `src/index.css`, `src/components/ui/index.tsx`, `src/lib/filter.ts`, `src/lib/format.ts`, `src/lib/url.ts`, `src/store/selector.ts`, `public/data/catalog.json`.
**Compliance baseline:** `research/dashboard-ux.md` (the dossier this build was supposed to follow).

**Method (`uxui-evaluator` skill).** Skill loaded and followed. `UXUI_API_KEY` is **not set** in this environment, so the `audit` toolbox call was not made and the evaluation ran on the skill's **offline/local procedure**: framework applied from internal knowledge, severities mapped to `critical / warning / suggestion`, score computed locally. `api_enriched: false`. Principle codes below are mapped to the nearest framework entry and could **not** be verified against the API catalogue.

**Revision note.** Another agent was editing and reverting `src/` while this evaluation ran. Every `file:line` citation below was re-verified against the working tree at **2026-10-22T07:15-03** and each one quotes the code it points at, so the snippet — not the number — is the authoritative locator if lines drift.

**Interface type:** `dashboard` (data-dense comparison surface; dominant task = *filter 468 models down, then decide between 2–6*). Parts evaluated: **1 (Foundations), 2 (Core), 4 (Interface Patterns)**, plus Part 3 (Design Systems) where typography/colour is the issue and Part 6 (accessibility, trust) for the WCAG failures. Part 5 skipped — no AI-specific signalling in the UI.

---

## 1. Verdict

| | |
|---|---|
| Framework score (skill formula) | **0 / 100 — saturated** (2×critical −30, 8×warning −56, 19×suggestion −57 = −143; the skill's linear model only assumes up to ~8 findings) |
| Practical band | **fair** — the visual system is genuinely good; the failures concentrate at the two points of first use (the table and the hero chart) and in accessibility |
| Blockers | **2** |
| High | **8** |
| Medium | **14** |
| Low | **5** |
| WCAG 2.2 | fails **1.4.3** (contrast) on every micro-label; **1.4.11** on control boundaries; **1.3.1/4.1.2** on the table grid; the scatter has no keyboard/AT path (**2.1.1**) |

The build followed the dossier well where the dossier was specific: self-excluding facet counts, the empty-state repair diagnostic, virtualised 468-row table with sticky header, reduced-motion clamping, URL-as-state, log price slider with distribution, Pareto frontier, and an honest `—` for every missing value. The failures are mostly **width/overflow plumbing, the colour channel on the scatter, the honesty of counts, and 10 px text at 4.08:1** — all cheap to fix.

### Severity profile

| Severity | Count | Where it bites |
|---|---|---|
| blocker | 2 | the table at any laptop width < 1374 px; the scatter for keyboard/AT users |
| high | 8 | contrast, count honesty, no-op filters, silent row deletion, two chart-encoding lies, duplicate plotting, filter-state visibility |
| medium | 14 | dead slider thumbs, price control geometry, recommendation cards, scroll planes, ARIA, radar gating, jargon, false "pressed" state, key validation, palette, sharing, loading, sort affordance |
| low | 5 | dimmed-but-unfocusable values, formatting, glyphs, chart chrome, in-app motion control |

---

## 2. Findings

### B-01 · blocker · Table columns are clipped and unreachable below ~1374 px viewport width
**Principle** F.4.2.01 Responsive adaptation / F.2.1.01 Visible system state (traversal affordance); dossier §3.1, §3.3.
**Evidence**
- `ModelTable.tsx:93` — outer wrapper is `className="overflow-hidden rounded-[10px] …"`.
- `ModelTable.tsx:124-131` — the scroll container is `className="overflow-y-auto overscroll-contain"`: **no `overflow-x`**, and the ancestor clips.
- `ModelTable.tsx:25-37` — 11 fixed-pixel columns, `width` + `minWidth` set inline at `:103-104` (header) and `:164` (cells). Default-visible set = 1038 px (11 columns incl. Coding = 1108 px).
- Geometry: content pane = `viewport − 32 px page padding − 288 px rail − 16 px gap` (`App.tsx:347`). Pane needs ≥ 1038 px → **viewport must be ≥ 1374 px**.
  - 1366 px (common 13-14" laptop): 1030 px pane → **SOM column clipped**.
  - 1280 px: 944 px pane → SOM (68) + 26 px of TOK/S clipped.
  - 1024 px: 688 px pane → CACHE, INTEL, TOK/S, SOM gone (350 px clipped).
  - 390 px: 358 px pane → 680 px clipped; only Model + half of In renders.
- No mobile card fallback anywhere (`App.tsx:699-712` renders `ModelTable` at every breakpoint), which dossier §3.3 makes mandatory (<640 px = cards).
**Remediation**
1. One scroll owner on both axes: `ModelTable.tsx:128` → `className="overflow-auto overscroll-contain"`; inside it wrap header + rows in `<div className="min-w-[1038px]">` so the header scrolls with the body.
2. Sticky first column: model cell and header cell get `sticky left-0 z-[2] bg-base` (header `bg-base/95`), plus `shadow-[8px_0_12px_-12px_rgba(0,0,0,1)]` when `scrollLeft > 0`.
3. Or cut default columns to the dossier's 9 (`Model, In, Weights, Context, In $, Out $, Cache, Intel, Speed`) and move SOM to a pinned column — SOM is sortable and persisted today with no visibility toggle (`ModelTable.tsx:36` has no `hideInConfig`), which is why it is always the first casualty.
4. `<768px`: render a card list (`name / provider / 2×2 metric grid / modality+weights chips`) from the same virtualised slice.
**Impact** At the most common laptop widths the product's headline metric (SOM, the column that *ranks* the whole table) is off-screen with no scrollbar, so the default sort key is invisible: users see a table ordered by a number they cannot read. On phones the table is ~30% usable. This is the single defect most likely to produce abandonment of the primary task.

---

### B-02 · blocker · The scatter is mouse-only and has no accessible alternative
**Principle** F.6.1.01 Accessibility / F.4.1.02 Keyboard operability; dossier §2.7 (roving focus, live region, "View as table"), §1.4 of WCAG 2.1.1.
**Evidence**
- `Scatter.tsx:255-278` — each mark is `<motion.circle … onClick={() => onToggle(...)}>` with **no `tabIndex`, no `role`, no `aria-label`**, inside an SVG that is `role="img"` (`:191`). An `img` role flattens the whole subtree for AT: screen readers get the single string "Blended price versus intelligence index, log scale" and nothing else.
- `Scatter.tsx:268-276` — the detail tooltip is `onMouseEnter`-only; there is no focus equivalent.
- `App.tsx:567-613` — the chart card is a `div.bezel`, not a `<figure>`; there is no `<figcaption>`, and the header controls (`:576-590`) offer only collapse — no "View as table".
- Keyboard users *can* reach and star models in the table, so the app is not fully blocked — but the chart, which is the surface the product is designed around, is decorative-only for them.
**Remediation**
1. Mark groups get `role="button" tabIndex={-1} aria-label={`${name}, ${formatPrice(blended)} per 1M, intelligence ${score}, ${openness}`}`; SVG gets `tabIndex={0}` with a roving `focusIndex`; `←/→` move by x-order, `Home/End`, `Enter` = toggle into compare.
2. One `aria-live="polite"` line under the plot announcing the focused mark.
3. Visible focus ring on the focused mark: `stroke="#c6f24e" strokeWidth={2} r={r+2}`.
4. Add a `Table | Chart` segmented in the card header (`App.tsx:576-589`) that swaps the SVG for a real `<table>` of the plotted points.
5. Wrap the card in `<figure>` + `<figcaption className="text-[11px] text-fg-dim">` stating the finding ("Open-weight models cluster below $2/1M at 40+ intelligence") instead of the encoding.
**Impact** For the ~8% of users who navigate by keyboard and the ~5% on screen readers, the app's most distinctive artifact contributes nothing; the Pareto story is invisible. Also the cheapest fix relative to its impact.

---

### H-03 · high · `--color-fg-dim` fails AA on every micro-label (4.08:1 at 10 px)
**Principle** D.2.3.01 Colour contrast / legibility (WCAG 1.4.3); dossier §0.1 (≥4.5:1 axis labels, type scale starts at 11 px).
**Evidence** Measured from `index.css:18` (`--color-fg-dim: #6c727c`) and `index.css:20-21`:

| Pair | Ratio | Used by |
|---|---|---|
| `#6c727c` on `#0a0a0e` (base) | **4.08:1** | `.eyebrow` (`index.css:172-179`): FILTERS, INPUT MODALITIES, OUTPUT, WEIGHTS, PRICE, CACHE PRICING, CONTEXT WINDOW, BENCHMARKS, CAPABILITIES, PROVIDER — 10 px uppercase |
| `#6c727c` on `#101014` (panel) | 3.92:1 | pick-card rationale `App.tsx:548` |
| `#6c727c` on `#16161c` (elevated) | 3.72:1 | tooltip metric labels `Scatter.tsx:367` |
| table column headers | 4.08:1 | `ModelTable.tsx:106-109`, 10 px uppercase `tracking-[0.09em]` |
| chart tick + axis titles | 4.08:1 | `Scatter.tsx:206, 226, 302, 313`, 10–10.5 px |

All are normal-size text → **require 4.5:1**; every one fails. There are 40+ such labels on the default screen.
**Remediation** `index.css:18` → `--color-fg-dim: #8a9099` (6.14:1 on base, 5.60:1 on elevated — measured). Keep `#6c727c` as a new `--color-fg-faint` for non-text only (dividers, icon strokes). Simultaneously lift the two smallest type sizes into the dossier's token scale: `.eyebrow` 10→11 px (`index.css:173`), table header `text-[10px]`→`text-[11px]` (`ModelTable.tsx:106`), chart labels 9.5–10.5→11 px (`Scatter.tsx:207, 227, 287, 303, 313`).
**Impact** WCAG 1.4.3 failure across the entire information architecture — the labels that partition the rail and the table are the least readable text on screen, and they are what makes 393 results legible as 10 facets. Also a direct legibility cost for the middle-aged developer persona this tool targets.

---

### H-04 · high · The Weights facet count contradicts its own result set (unknowns folded in silently)
**Principle** C.1.1.01 Consistency & standards / F.6.2.01 Trust signals; dossier §1.4 (counts must predict "if I add this, I get N"), §7.5 (`openness` has three states — never fold `unknown`).
**Evidence**
- Screenshot, rail Weights row: `Any 393 · Open 208 · Proprietary 170`. **393 − 208 = 185 ≠ 170** → 15 models are neither displayed nor accounted for.
- `filter.ts:135-137` — `weights === "closed"` returns false only when `model.openness === "open"`, i.e. **`unknown` matches "Proprietary"**.
- `FilterRail.tsx:283-287` — the numeral comes from `counts.weights[option.id]`, i.e. `closed` only; `counts.weights.unknown` is computed (`filter.ts:228`) and thrown away.
- `FilterRail.tsx:291-294` — the hint even explains the folding in prose instead of exposing it as a value.
**Remediation** Either (a) make the predicate honest — `weights === "closed" → model.openness === "closed"` — and surface the third bucket as a 4th option `Unknown (15)` in the same 3-col grid (`grid-cols-2` → `grid-cols-4`, or `grid-cols-2` with `Any` full-width); or (b) keep the fold but label it `Proprietary + unknown 185` and add an `Unknown` badge to those rows in `ModelTable`'s Weights cell (`ModelTable.tsx:190-198`, which already handles `unknown` via `OPENNESS_LABELS`). Dossier §7.5 prefers (a).
**Impact** A count is a promise. A user who clicks "Proprietary 170" and receives 185 rows learns that numbers in this rail are approximate, which retroactively discredits the distance-to-result information the whole faceted model depends on.

---

### H-05 · high · "Text-only" is a no-op: it filters for "accepts text", not "text only"
**Principle** C.1.4.01 Error prevention / F.1.1.03 mental model; dossier §1.3 (`text only` must be `outputs == ["text"]`, a distinct predicate).
**Evidence**
- `FilterRail.tsx:221-228` — the chip's `title` literally reads *"Only models that accept text and nothing else"*, but it patches `{ input: { mode: "all", values: ["text"] } }`.
- `filter.ts:123-128` — with `mode: "all"`, the predicate is `selected.every(has)` → **text ∈ input modalities**, which is true of all 393 results. Clicking it changes the count by zero and adds an `input text` applied chip.
- Additionally, the dossier's `text only` predicate belongs to **output** modality; the rail's Output section (`FilterRail.tsx:238`) has no text-only affordance and is collapsed by default.
**Remediation** Add a real predicate: `filters.textOnlyOut: boolean` → `model.modalities.output.length === 1 && output[0] === "text"`, rendered as the first chip of the **Output** section (which should then be open by default), with the count of matching models. Delete the mislabelled chip from Input modalities, or relabel it `Has text input` if that is what it does.
**Impact** This is the one control that answers the most common real-world question ("I only need a text generator"). Today it silently does nothing, so the user's result set is filled with vision/audio models they explicitly tried to exclude, and they will conclude the filter is broken — which it is.

---

### H-06 · high · Benchmark thresholds silently delete every unscored model
**Principle** C.1.4.01 Error prevention / F.1.1.06 missing-data transparency; dossier §1.3 and §7.5 ("41 models have no score → Include them"; a threshold over a 40 %-coverage axis silently deletes 60 % of the catalogue).
**Evidence**
- `filter.ts:177` — `if (value === null || value < minimum) return false;` — a model with no score for the axis is dropped with no signal.
- `FilterRail.tsx:457-477` — the only disclosure is the coverage numeral inside `Label`'s hint (`≥ 60 · 182 models`, `:462`). There is no "N models unscored → include", no count of what the threshold removed, and no `includeUnscored` control (the global `requireScored` switch at `:450-455` is the *inverse* and lives above the axes).
- Catalogue has 22 benchmark axes (`public/data/catalog.json`), so a realistic user sets 2–3 thresholds and loses half the table without ever learning why.
**Remediation** Under each `Range` add `EmptyHint`-styled line: `{unscored} of {total} models have no {axis} score · [Include]`, wired to a per-axis or global `includeUnscored` flag used by the predicate (`value === null ? filters.includeUnscored : value >= minimum`). Also render the surviving count next to the threshold label (`≥ 60 · 182 scored · 211 unscored`), and put the resulting row count in the section header so the effect of the drag is visible before release.
**Impact** Silent row deletion is the fastest way to destroy trust in a comparison tool: users cannot distinguish "this model is bad" from "this model was not measured", which is exactly the distinction the tool exists to make. Fix is ~15 lines.

---

### H-07 · high · The chart legend states an encoding the chart does not use
**Principle** C.1.1.01 Consistency / D.2.1.02 visual hierarchy of encodings; dossier §2.6 ("weights are never encoded by hue", legend must be truthful).
**Evidence**
- `App.tsx:756-770` (`Legend`) — "open" is drawn as a **green filled dot** (`bg-open/40 ring-open`) and "closed" as a **blue ring** (`ring-info`).
- `Scatter.tsx:252-263` — the real encoding is: `stroke = creatorColor(model.creator)` for **every** point, `fill = open ? creatorColor : transparent`. So **hue = creator, fill = openness**. A blue ring can be open; a green filled dot can be `openai`/`nvidia`.
- `Scatter.tsx:9-22` — 8 hashed colours (`hashIndex(creator, 8)`) over **58 distinct creators** in the catalogue. ÷8 → ~7 labs share every hue.
- Screenshot, chart: green, orange, pink, yellow, blue and teal discs all appear with both filled and hollow variants — visibly contradicting the legend.
**Remediation** Rewrite the legend to the actual channels: `● filled = open weights` / `○ ring = proprietary` / `- - - efficient frontier`, plus a size key from H-08. Then fix the hue channel: colour only the top-6 creators by count (`creatorColor` on a ranked list) and render all remaining creators as `#8b8f98` — or drop creator hue entirely and reserve hue for selection (`accent`) and weights (`open`/`closed`), which is 2 categories instead of 58.
**Impact** 58 creators × 8 hashed hues means the colour channel carries no retrievable information, while the legend teaches users to read it as the weights dimension — the one dimension the dossier says must never be hue-coded because it is the axis users decide on. Two lies for the price of one.

---

### H-08 · high · Mark size encodes context window with no size legend
**Principle** F.1.1.02 Cognitive load / D.2.1.02 visual encoding; dossier §2.2 ("size legend 8K / 128K / 1M — otherwise size reads as noise").
**Evidence** `Scatter.tsx:90` — `r: 3 + Math.min(5, Math.sqrt(model.contextLength / 1_000_000) * 3.2)`. Nothing in `Scatter.tsx` or in the card header (`App.tsx:569-589`) explains the radius; the only legend is `Legend` (`App.tsx:756-770`), which covers fill and the frontier line. In the screenshot, radii vary from ~3 px to ~8 px with no reference.
**Remediation** Add a 3-mark key in the card header row (next to `Legend`): `<span style="width:6,11,18px; aspect-radius">8K · 128K · 1M</span>`, i.e. three circles at `r = 3, 5.5, 8` with the labels `8K / 128K / 1M` at 10 px `text-fg-dim`; or move the encoding to the tooltip and freeze `r` at 4 px.
**Impact** The most visually salient non-positional channel is currently pure decoration: a reader cannot tell whether a big dot means "long context", "expensive" or "new". Wasted encoding capacity on the hero chart, and it actively invites wrong inferences about the models' capability.

---

### H-09 · high · Variant duplicates are plotted, labelled and included in the frontier
**Principle** F.1.1.03 Mental model / data integrity; dossier §7.5 (`alias` and `router` must be excluded from scatter/radar by default; `free`/`batch` plotted only on opt-in, "otherwise the frontier gets polluted with duplicates").
**Evidence**
- `filter.ts:46,48` — defaults are `hideAliases: false`, `hideFree: false` (only `hideBatch`/`hideDeprecated` are on).
- Catalogue (`public/data/catalog.json`): 468 models = 349 `standard` + 75 `batch` + **19 `alias`** + **18 `free`** + **7 `router`**.
- `App.tsx:601-602` — the scatter receives `filtered` with no variant filtering; `App.tsx:118` computes `paretoFrontier(filtered)` over the same set.
- Screenshot, chart labels: **"GPT-6 Astra Pro" and "GPT-6 Astra"** are both plotted and both labelled; rail Weights shows 15 uncounted `unknown`. Table rows 2 and 5 are the `(free)` duplicates of paid entries.
- Consequence: the same underlying model can own two dots, one of which sits on the frontier because its `:free` twin is $0 (free models are stripped to the strip, but the paid twin remains).
**Remediation** Feed the scatter (and frontier) `filtered.filter(m => m.variant === "standard")` by default; add a `Show variants` switch in the chart header that lifts the filter, and label non-standard marks with the existing `VARIANT_LABELS` badge (as the table does at `ModelTable.tsx:264-268`). Exclude `alias`/`router` from `facetCounts` too, or the result count and the plot disagree.
**Impact** The hero chart's single most valuable analytic — the efficient frontier — is computed over a set containing duplicates of the same model, so the "best deal" line can be drawn through a model the user cannot actually buy at that price, and the plot looks larger than the market is.

---

### H-10 · high · The applied-filter strip is not sticky and caps at 8 chips with an inert "+N more"
**Principle** F.1.1.03 Mental model / F.2.1.01 system state visibility; dossier §1.5 (40 px sticky strip, max 2 rows, `+N more` **popover**, `Clear all`).
**Evidence**
- `App.tsx:317-343` — the strip is a plain flow `div` placed **between** the sticky header (`:245`) and `<main>` (`:345`); it is not `sticky`.
- `App.tsx:320` — `chips.slice(0, 8)`.
- `App.tsx:331-333` — `+{chips.length - 8} more` is a `<span>`: not clickable, not a popover, so chips 9..N **cannot be removed from the strip at all**.
- Because the page itself scrolls to reach the table (the table starts at y≈705 of 1000 px), the strip is off-screen for the entire duration of the actual task.
**Remediation** Move the block inside `<header>` (after the nav row) or give it `sticky top-14 z-30 glass border-b border-line`; add `max-h-[72px] overflow-hidden` with a fade + real popover for overflow:
```tsx
<Popover width={280} trigger={<button className="text-[11px] text-fg-dim underline">+{n} more</button>}>
  {/* remaining chips with the same clear() handlers */}
</Popover>
```
Also raise the visible cap from 8 to whatever fits two rows (~12 at 1600 px).
**Impact** Once the user scrolls — i.e. immediately — they cannot see which of 10 facets are active, which is the exact failure the dossier cites Baymard for ("users must reopen the panel to recall the filter state"). Filters 9+ become write-only state.

---

### M-11 · medium · Every single-valued Range renders a second, dead thumb
**Principle** C.1.4.01 Error prevention / affordance truthfulness (F.4.2.02 target behaviour); dossier §1.6 (a range *is* the filter value).
**Evidence** `Range` always renders two thumbs (`ui/index.tsx:254-255`), but three call sites are single-valued and discard the first element:
- `FilterRail.tsx:391-403` "Max cache-read price" — `value={[0.01, Math.min(filters.cache.max, 20)]}`, `onValueChange={([, max]) => …}`.
- `FilterRail.tsx:410-418` "Cache saves at least" — `value={[0, filters.cache.minDiscount]}`.
- `FilterRail.tsx:466` and `:489` — one dead left thumb **per benchmark axis** (2 core + up to 9 domain = up to 11 axes per session).
Dragging the left thumb moves a handle, shows a hover scale (`ui/index.tsx:254 hover:scale-110`) and changes nothing.
**Remediation** Add a single-thumb mode to `Range`: `if (single) render one <SliderPrimitive.Thumb>` with `value={[v]}`; or pass an explicit `lockedMin` that renders the left thumb as `pointer-events-none opacity-25` with `cursor-default`. Prefer the real single-thumb slider — Radix supports `value` with one element natively.
**Impact** ~11 false affordances per session. A control that responds visually but has no effect is worse than no control: it teaches the user that this panel's sliders are unreliable, right where precision matters.

---

### M-12 · medium · The price control misreports the distribution and cannot express an exact price
**Principle** D.2.2.01 Data-display fidelity / I.1.1.03 numeric input; dossier §1.6 (32 px histogram behind the track, accent tint over the selected span, tick snapping, editable 72 px numeric fields).
**Evidence**
- `FilterRail.tsx:316-324` — the histogram is `<PriceHistogram width={244} height={24}>` while the track is `w-full` inside `px-1` of a 288 px rail (≈262 px) and the SVG is `absolute inset-x-0 bottom-0`. Screenshot, rail price block: the bars stop ≈18 px short of the right thumb, so bin *n* is not under the price it represents — a 26-bin distribution read against a 262 px axis.
- No selection tint: `PriceHistogram` paints every bar `rgba(255,255,255,0.16)` (`Charts.tsx:258`) regardless of `filters.price.min/max`; the full span is the default state, so the histogram has no interactive meaning.
- `FilterRail.tsx:340-346` — the min/max read-outs are static `<span>`s. There is no way to type `$1.13`; the log slider resolves to `(max−min)/1000` multiplicative steps.
- `FilterRail.tsx:329` vs `filter.ts:42` — the filter default is `max: 5000` but the thumb is clamped to `priceBounds.max` (263): the thumb sits at the far right while the value is not at its maximum. Touch the right thumb and release at the end and `max` becomes 263 → `activeChips` (`filter.ts:344`, `max < 5000`) emits a **phantom chip** `blended $0.00–$263.00/1M` and a URL param, even though zero rows are filtered, and the true "unbounded" state is now unreachable except via Reset.
**Remediation** (a) `width={244}` → measure the container (`useMeasure`, already exported from `Scatter.tsx:24`) or `className="w-full"` with `viewBox`; (b) pass `[from,to]` into `PriceHistogram` and paint in-range bars `rgba(198,242,78,0.35)`; (c) replace the two static spans with `<input type="number" className="h-6 w-[72px] numeric rounded-[4px] border border-line bg-white/[0.03] px-1.5 text-[11px]" value={…}>` bound to `price.min/max`; (d) treat `max >= priceBounds.max` as unbounded: set the patch to `{ …price, max: 5000 }` when the thumb is at the right edge, and gate the chip on `max < priceBounds.max`.
**Impact** The histogram is the one control that teaches where the market actually lives; drawn 7 % out of register against its own axis it teaches a slightly wrong distribution. And a budget tool without a typed budget is a category error — `$2.50` is a real procurement ceiling.

---

### M-13 · medium · Recommendation cards cite a score they never show, cannot be dismissed, and own the best real estate
**Principle** F.1.1.06 Serial position / D.2.1.02 hierarchy / F.6.2.01 trust; dossier §7.3 ("do not auto-apply a recommendation on first load"), §6.
**Evidence**
- `App.tsx:533-565` — four `<button>` cards, `xl:grid-cols-4`, y≈76–176 at 1600×1000.
- `scoring.ts:197` — rationale "Top SOM score in this set (81.3)"; the card's own metric row (`App.tsx:551-557`) shows `45.1 · $0.525 · 1.0M`. The **81.3** the card claims is never rendered on the card — it lives only in the table's SOM column. Same for "Most quality per dollar": rationale says `$0.05`, metrics render `$0.052`.
- No dismiss/close, no "why these?" disclosure, no link into the compare tray; the card silently opens the drawer (no chevron or hover cue beyond a border change).
- Cost: the table begins at y≈705 of a 1000 px viewport, i.e. **~7 visible rows**; the recommendation strip consumes 100 px + 12 px gap of the primary surface's budget.
**Remediation** (a) Render the cited number: right-aligned `SOM 81.3` in `numeric text-accent` on the card's top row. (b) Add `×` dismiss with persisted `showPicks` state, and collapse to a single 32 px row ("Suggested: DeepSeek V4.1 Flash 1017 · GLM 5.3 Flash · +2") after first dismissal. (c) Make it `role="list"` of links, not four big buttons, and put a `Compare` affordance on each card (`onToggle` exists already). (d) Use `formatPrice` consistently in the rationale so card and body agree to the digit.
**Impact** An opinionated analytic that cannot be verified in place reads as marketing; a permanent 112 px tax above the work surface makes the table feel like the secondary artifact. Users who distrust the picks cannot remove them.

---

### M-14 · medium · Three nested scroll planes, and the toolbar governing the table is not sticky
**Principle** F.1.1.02 Cognitive load / spatial stability; dossier §0.1 (48 px sticky toolbar), §3.1.
**Evidence** Page scroll (`App.tsx:237` `min-h-[100dvh] flex-col`) + rail inner scroll (`FilterRail.tsx:190` `overflow-y-auto pb-16`, inside `max-h-[calc(100dvh-84px)] overflow-hidden`, `App.tsx:350`) + table inner scroll (`App.tsx:711 maxHeight={620}`, `ModelTable.tsx:127-128`). The toolbar with `Sort`, `Compact/Cozy/Roomy`, `Columns`, `Export config` (`App.tsx:626-697`) sits in normal flow at y≈675, **outside** the sticky header, so one wheel gesture over the table moves the table's rows while the sort control scrolls away above the fold — and the table header stays stuck against a viewport that also has the site header stuck against it (two stacking sticky elements, 56 px apart).
**Remediation** Give the toolbar `sticky top-14 z-30 -mx-3 bg-base/95 px-3 py-2 backdrop-blur` or move it into the table's own sticky header block; reduce the table's inner `maxHeight` to `calc(100dvh - 320px)` so the nested scroll rarely engages and the page owns the vertical axis; make the rail `overflow-y-auto` the only rail scroller (already true).
**Impact** Scroll-trap behaviour is the classic dashboard friction: the user's wheel gesture moves a different plane than the one under the cursor, and the controls that explain the visible order disappear exactly when the order matters.

---

### M-15 · medium · Table ARIA is a `role="table"` with no cells, no column headers, no row indices
**Principle** F.6.1.01 Accessibility (WCAG 1.3.1 / 4.1.2); dossier §3.1 (structural table semantics).
**Evidence** `ModelTable.tsx:129-131` — `role="table" aria-rowcount={models.length}`; `:139` — `role="row"`; every cell is a bare `div` (`:162-168`); the header row is a `div` of `<button>`s (`:94-122`) with no `role="columnheader"`. Rows carry no `aria-rowindex` and are absolutely positioned, so AT announces "table, 468 rows" and then unlabelled rows whose numbers have no column identity.
**Remediation** Either switch to a real `<table>` with `<thead>/<th scope="col">` and `position: sticky` on the header/`<tbody>` cells — trivial here because the layout is already fixed-width — or complete the ARIA grid pattern: `role="grid"` on the scroller, `role="rowgroup"` wrappers, `role="columnheader"` with `aria-sort={active ? (dir === -1 ? "descending" : "ascending") : "none"}`, `role="gridcell"` on each cell, `aria-rowindex` per row.
**Impact** The 468-row table is the product's primary artifact and is currently announced as a bag of numbers. `aria-sort` alone also fixes a plain usability gap: sort state is only visible as a chevron colour (`ModelTable.tsx:96, 113-118`).

---

### M-16 · medium · Compare silently drops models 5–6 from the radar
**Principle** C.1.1.01 Consistency / error prevention; dossier §2.3 (radar gated at ≤4 with an explicit substitute, never a silent slice).
**Evidence** `store/selector.ts:94` `MAX_COMPARE = 6`; `views.tsx:40` "Star up to **six** models"; `Charts.tsx:32` `const series = models.slice(0, 4)`; the only disclosure is a 10.5 px caption `max 4 series` (`views.tsx:84`). `Charts.tsx:56-61` has a proper gate message ("Select two to four models…") but it never fires for 5–6 because the slice runs first.
**Remediation** `if (models.length > 4)` render the gate message ("Radar compares up to 4 — [switch to bars]") with a `RankingBars` fallback for all 6, or set `MAX_COMPARE = 4` and change the compare copy to "four". Do not slice.
**Impact** A user comparing six models reads a polygon built from four and must assume the other two were unmeasured. Contradictory capacities in the same view (6 allowed / 4 charted) also read as a bug.

---

### M-17 · medium · Missing benchmark values are drawn as zero in the radar
**Principle** D.2.2.01 data fidelity / F.1.1.06; dossier §2.3 ("centered normalisation, no fake zeros"), §7.5.
**Evidence** `Charts.tsx:108` — `((model.benchmarks[axis.key] ?? 0) / …) * 100`: a model with no `finance` score is plotted at the centre, visually identical to a genuine 0. `Charts.tsx:36-40` only filters an *axis* when fewer than 2 series have it, so with 2 of 6 axes measured the polygon closes through the origin for the rest.
**Remediation** Skip missing vertices (`axes` per-series) or render a hollow marker at the vertex with `title="not measured"`, and add a `2/6 axes measured` note under the chart. In `BenchmarkRadar`, filter `axes` to those where **all** series have a value, or draw each series over its own available axes with `strokeDasharray` per dossier §2.3.
**Impact** The radar's whole purpose is comparing profiles; missing data currently reads as a capability gap. Users will reject a model for a "0" that was never measured — the opposite of the tool's promise.

---

### M-18 · medium · The app's headline metric is an unexplained acronym ("SOM")
**Principle** F.1.1.03 mental model / user vocabulary (dossier §1.2 "facets must match user vocabulary"); F.1.1.02.
**Evidence** `ModelTable.tsx:36` — column label `SOM`, hint "Blend of your weights, ranked within this set" (a `title`, i.e. unreachable on touch and invisible until hover); `filter.ts:72` — sort option "SOM score"; `scoring.ts:197` — "Top SOM score in this set". The word SOM never appears with a definition on any surface, and the header logo (`App.tsx:248-255`) presents "SOM / LLM selector" as the brand, so the column also reads as "the app's own number".
**Remediation** Rename the column header to `Match` (68 px fits) and the sort option to `Match score`; add one line under the sort control (`App.tsx:644`): `Match = 0–100, weighted blend of intelligence, coding, price and speed — set weights in Presets`. Keep "SOM" only in the brand and in a `Tooltip` on the header.
**Impact** The default sort key of the whole table is not interpretable from the screen. Users sort by a number they cannot explain, which is both a comprehension and a trust cost for the one metric that encodes their own stated priorities.

---

### M-19 · medium · "Clear" is rendered as an active, selected filter value
**Principle** C.1.1.01 Consistency (state language); dossier §1.2/§1.3 (an accent chip means "this value is applied").
**Evidence** `FilterRail.tsx:229-234` — `<Chip active={filters.input.values.length === 0} onClick={…}>Clear</Chip>`. With the default filter (no modality selected) this renders in the exact accent treatment that means "applied value" everywhere else in the same chip group (`ui/index.tsx:98-100`: `border-accent/40 bg-accent/15 text-accent`). Screenshot, rail Input modalities: **"Clear" is highlighted while "Text-only" is neutral**, on a screen where nothing is selected.
**Remediation** Render it outside the chip group as a text button: `className="text-[11px] text-fg-dim underline decoration-dotted hover:text-fg"`, `aria-label="Clear modality selection"`, always visible, never accent. If it must stay in the row, use `variant="ghost"` styling and no `aria-pressed`.
**Impact** The default screen tells the user that a reset action is a selected value. It also gives `aria-pressed="true"` to a control that is not a toggle (`ui/index.tsx:94`), which screen readers announce as a pressed button — the one place the accessibility tree actively lies about state.

---

### M-20 · medium · The key dialog cannot be verified, reveals nothing, and fails silently
**Principle** C.1.4.01 Error prevention / I.1.1.03 form error prevention / F.6.2.01 trust; dossier §7.4.
**Evidence**
- `KeyDialog.tsx:76-87` — `type="password"` with **no reveal toggle**; the user cannot check a 70-character key for a typo before saving.
- `KeyDialog.tsx:116-125` — `Save & reload data` calls `onSave` → `App.tsx:427-430` `state.hydrate({refresh:true})`, which only toasts "Refreshing catalogue…" (`App.tsx:174`). There is **no validation, no inline success/failure, no per-field status**.
- A rejected AA key degrades into `catalog.feed == null` → the amber banner `App.tsx:615-624` says "Benchmark data is not loaded… Add an Artificial Analysis key", which blames *absence* when the actual cause is *rejection*. 401 and 429 are indistinguishable from "no key".
- `KeyDialog.tsx:24-25` — `useState(keys)` initialises the draft once; the component is always mounted, so reopening shows stale values after a save or after an import.
**Remediation** (a) `useEffect(() => setDraft(keys), [open, keys])`; (b) add an eye/eye-off button inside both inputs (`absolute right-2`); (c) on save, run a probe (`fetchProviders`/AA `/models` is already imported at `ModelDrawer.tsx:7`) and render per-field state: `✓ 468 models · AA tier 1` or `✗ 401 — key rejected by Artificial Analysis`; (d) make the amber banner read the actual error (`source === "api"` + feed failure → "AA rejected your key (401)", not "not loaded").
**Impact** Key entry is the first-run gate for half the app's value; today a typo produces a plausible-looking app with a mystery warning, and the user's next move is to re-read the banner rather than the key. Silent failure at an authentication boundary is the highest-cost trust failure in the product.

---

### M-21 · medium · No command palette and no keyboard path to model/facet/preset
**Principle** F.2.2.03 Hick's Law mitigation / F.4.1.02 keyboard operability; dossier §1.8 + signature element #8 ("labelled `Filters & jump to… ⌘K` button in the header", "never the only way to filter").
**Evidence** `grep` over `src/` finds **no** `metaKey`/`ctrlKey`/`keydown` listener, no palette component (`App.tsx:245-315` header holds: logo, view segmented, count, refresh, Connect keys). `src/pages/` and `src/components/layout/` are empty. With 468 rows, 22 benchmark axes and 58 providers, the only way to reach a specific model is the 32 px search field in the rail (`FilterRail.tsx:171-177`) or scrolling.
**Remediation** Add a 240 px header button (`App.tsx:269`, before the count): `⌕ Filters & jump to… <Kbd>⌘K</Kbd>`, and a Radix `Dialog` palette at `top: 15vh; width: 640px` with scopes `@model #preset :facet >action`, 44 px rows, `↑↓ / ↵ / esc` footer. Wire `→`/`↵` on a result to `onInspect`, `:facet value` to `onPatch`.
**Impact** The dossier calls keyboard-first flow the signal that a tool is meant for daily use; without it every repeat visit pays the full pointer cost of a 10-facet rail, and the app reads as a demo rather than a workbench.

---

### M-22 · medium · Shareable state exists but is undiscoverable and ignores the Back button
**Principle** F.2.1.01 system state / recognition over recall; dossier §4.2 (Copy link, `pushState` on preset/compare, `popstate` restore).
**Evidence** `App.tsx:99-106` writes the query with `window.history.replaceState` (debounced 350 ms) — good — but there is **no `Copy link` control** anywhere and no `popstate` listener (`grep` found none; boot parses the URL once at `App.tsx:82-96` and sets `booted.current = true`), and `replaceState` never creates a history entry. So: state is shareable in principle, invisible in practice, and the browser Back button will leave the app instead of undoing a filter change.
**Remediation** (a) Add `Copy link` (`Button size="sm" variant="ghost"` with a `Link2` icon) next to `Export config` at `App.tsx:689`, calling `navigator.clipboard.writeText(location.href)` + `toast.success("Link copied — filters, sort and selection included")`; (b) `useEffect` on `[filters]` with `pushState` for preset switches and compare adds (keep `replaceState` for slider drags); (c) add `window.addEventListener("popstate", () => { const url = decodeState(location.search); … })`.
**Impact** "The state is a URL" is the quiet promise of tools developers respect; an invisible, Back-hostile URL is the same code with none of the payoff, and sharing a view is the main reason a comparison gets pasted into a team thread.

---

### M-23 · medium · Loading is a bare spinner with no skeleton — the whole layout shifts on data arrival
**Principle** F.2.2.01 perceived performance / D.2.4.01 layout stability; dossier §3.2 ("the skeleton is the real geometry… no layout shift", shell < 100 ms).
**Evidence** `App.tsx:191-200` — `status === "loading"` renders a centred 24 px spinner and the word "Loading the model catalogue…" over an empty page; every panel (rail, picks, chart, toolbar, table) then mounts at once, so the first paint after data is a full reflow, and the rail's facet sections pop into existence as their counts compute.
**Remediation** Render the shell immediately: rail skeleton (search box + 6 section headers + 3 chip rows), 4 pick-card outlines, a 380 px chart `div` with the axis title, toolbar, and 9 table rows at `rowHeight = 40`. Use `animate-pulse` on `bg-white/[0.04]` blocks and stop shimmer after 1.2 s (`motion-safe:animate-none` under `prefers-reduced-motion`, which `index.css:218` already clamps).
**Impact** Perceived speed is mostly about the *absence of movement*, and this is the first thing a returning user sees on every refresh (`state.hydrate` runs on mount, and `handleRefresh` re-enters `loading`). A one-second spinner followed by a reflow reads slower than two seconds of stable skeleton.

---

### M-24 · medium · Sort affordance is invisible on non-sortable headers, and sorting shows no direction until active
**Principle** D.2.1.02 visual hierarchy of affordances / I.2.2.02 Fitts (target clarity); dossier §3.1 (active column shows ↑/↓; standard large-table battery).
**Evidence** `ModelTable.tsx:95-119` — every header cell is a `<button>` with identical chrome (`h-8 px-2 text-[10px] uppercase text-fg-dim`); sortable cells differ only by `hover:text-fg` and `cursor-pointer` (`:108`), and the arrow appears only for the active column (`:113-118`). Model, In, Weights, Output are `disabled` (no `sortKey`) — visually identical, unclickable, and removed from the tab order by `disabled`. Screenshot: only `SOM` shows a chevron, and nothing marks `CONTEXT`, `$/1M IN`, `CACHE`, `INTEL`, `TOK/S` as clickable.
**Remediation** Render a persistent, low-contrast sort glyph on every sortable header (`ChevronUp`/`ChevronDown` at `opacity-0 group-hover:opacity-60`, `opacity-100 + text-accent` when active), and stop using `disabled` for non-sortable columns — use `<div>` for them so the header row has no dead-but-focusable-looking targets. Add `aria-sort` per M-15.
**Impact** Sorting is the most-used interaction in a 468-row comparison table; hiding the affordance until after the click costs a discovery round-trip per column and makes four dead headers read as broken controls.

---

### L-25 · low · Zero-count facet values are removed from the keyboard order and crushed to 1.72:1
**Principle** F.6.1.01 Accessibility / error prevention; dossier §1.4 ("zero-count values stay visible but dimmed (opacity .38, **still focusable**)").
**Evidence** `FilterRail.tsx:198-199` — `dimmed={count === 0} disabled={count === 0 && !selected}`; `ui/index.tsx:102` — `disabled && "pointer-events-none opacity-30"` (measured `#a2a8b0 @30 %` = **1.72:1**), and `ui/index.tsx:101` dimmed → `opacity-40` = **2.20:1**. A `disabled` button is not focusable, so AT users never learn the value exists, and the hover `title` promised by the dossier is unreachable.
**Remediation** Drop `disabled`; keep `aria-disabled="true"` + `tabIndex={0}` + `title="0 models with the current filters"`, and use `opacity-55` (≈4.0:1) instead of `opacity-40`. Keep `pointer-events-auto` so the count tooltip works.
**Impact** Removing zero-count values from the tab order deletes the evidence that a *combination* is impossible rather than a *value* nonexistent — the distinction the dossier calls the shortest-path signal of a faceted UI. Cheap to fix, no visual cost.

---

### L-26 · low · Numeric and type inconsistencies across chart, table and cards
**Principle** C.1.1.01 Consistency; dossier §3.1 (3 significant digits, `<$0.01`, units in header), §2.5 (label each power of ten consistently).
**Evidence**
- `Scatter.tsx:229` — x ticks call `formatPrice(10 ** tick, 2)`; screenshot shows `$0.10`, `$1.00`, `$10.0`, `$100` — four precision rules on one axis (`format.ts:5-13` branches at <0.01, <1, <10, <100).
- `format.ts:9` — `perMillion < 0.01` renders 4 decimals: the table's cache column shows `$0.0060` and `$0.0069`, not `<$0.01` as the dossier requires.
- `format.ts:26` — `formatContext` prints `1.0M` for 1,048,576 and `1M` for 1,000,000; the screenshot shows both in adjacent rows (rows 1/4 vs 2/3/5), reading like different magnitudes.
- `scoring.ts:215` and `App.tsx:551-556` mix 2-decimal and 3-decimal prices for the same model ($0.05 vs $0.052).
**Remediation** One price formatter for ticks and cells: `formatPrice(v)` with a fixed 3-significant-digit rule and `<$0.01` below 0.01; `formatContext` → always one decimal for M (`1.0M` / `0.26M`) or always none above 999 K (`1M` / `262K`), pick one; use `formatPrice` in `scoring.ts` rationales.
**Impact** Low individually, but the price table is where this product claims expertise: mixed precision on the same axis looks like sloppy data rather than a formatting choice, and `$0.0060` implies a precision the source does not have.

---

### L-27 · low · Modality "glyphs" are 9 px letters with no legend
**Principle** D.2.2.01 encoding legibility; dossier §3.1 (3 glyphs at 14 px with `title`).
**Evidence** `ModelTable.tsx:177-188` — each modality is a `h-[16px] w-[15px]` box with `text-[9px]` and a single letter from `MODALITY_GLYPH` (`lib/labels.ts:43-49`: T/I/A/V/F); the box border is `border-line` = 1.16:1 and the letter is `text-fg-muted` at 9 px. In the screenshot: `T I`, `T I V`, `T I F`, and a lone `T`. `I` (Image) collides visually with the adjacent `INTEL` header, and `F` for File is not a standard glyph.
**Remediation** Use `lucide-react` icons (`Type`, `Image`, `AudioLines`, `Video`, `FileText`) at `h-3 w-3` with `text-fg-muted`, `gap-1`, and `title={MODALITY_LABELS[m]}`; add a 3-mark key to the dropdown that filters modalities or to the Columns popover entry.
**Impact** The modality column is the fastest way to scan "can this thing see images?", and at 9 px monochrome letters it is unreadable at a glance — the encoding is doing the opposite of its job.

---

### L-28 · low · Chart chrome below the dossier's minima: height, tooltip, free-model strip placement
**Principle** D.2.2.01; dossier §2.2 (min 420 px, grows to 560, padding left 56 / bottom 44), §2.5 (28 px "Free" strip **above** the plot), §2.2 (tooltip `role="tooltip"`, 260 px, positioned to stay inside the plot).
**Evidence** `App.tsx:606` — `height={380}`; `Scatter.tsx:40` — `PAD = {top:18, right:22, bottom:34, left:46}`; `Scatter.tsx:319-339` — the free-model strip renders **below** the SVG as 10 px chips; `Scatter.tsx:341-358` — the hover card is a `div` with no `role="tooltip"` and `left: hover.x` `-translate-x-1/2` with no viewport clamp, so for marks near the right edge (e.g. the $100 cluster) the 248 px card overflows the card boundary.
**Remediation** `height={440}`, `PAD.bottom = 44`, right `24`; move the free chips into a 24 px band above the plot with a divider (`border-b border-line` + `FREE` eyebrow); clamp the tooltip: `left: Math.min(Math.max(hover.x, 130), width - 130)`; add `role="tooltip"` and `aria-hidden={false}`.
**Impact** Low arousal, but the hero chart is the first thing a prospective user judges; an under-tall plot and a tooltip that escapes its card read as unfinished at exactly the moment of first impression.

---

### L-29 · low · The catalogue can only be refreshed, never cleared; no in-app motion control
**Principle** S.1.3.01 transparency of state / F.6.3.01 user control; dossier §5.4 (in-app `Reduce motion: System / On / Off`).
**Evidence** `App.tsx:286-293` — the only catalogue control is `RefreshCw` → `state.hydrate({refresh:true})`; there is no "use snapshot / use live api" toggle even though the footer displays `source` as a badge (`App.tsx:806`) and `state.source` lives in the store. Reduced motion is honoured globally (`index.css:218-227`) but there is no in-app override, and `useReducedMotion` is consulted per-component (`Scatter.tsx:71`, `Charts.tsx:31, 160`, `App.tsx:79`).
**Remediation** Add a `Popover` on the footer `source` badge with `Live API / Snapshot` and a `Reduce motion: System · On · Off` segmented (persist in the store next to `density`). Wire `reduce` to `prefers-reduced-motion || motionMode === "on"`.
**Impact** Power users cannot force the deterministic snapshot (useful when a provider rate-limits), and the dossier's explicit accessibility requirement for an in-app motion switch is unmet while the OS switch alone is the only path — a small, well-understood gap.

---

## 3. Compliance against `research/dashboard-ux.md`

| Dossier section | Status | Note |
|---|---|---|
| §0.1 Shell: 288 px sticky rail, sticky 56 px header, 24 px gutter | ✅ | `App.tsx:245, 349-351`; grid `lg:grid-cols-[288px_minmax(0,1fr)]` |
| §0.1 Sticky 48 px toolbar above the table | ❌ | Toolbar scrolls away — M-14 |
| §0.1 Focus ring 2 px accent + 2 px offset | ✅ | `index.css:102-106` |
| §1.1 Facets in a sidebar, applied state in a horizontal overview | ⚠️ | Both exist; the overview is not sticky — H-10 |
| §1.2 Three tiers, output/weights/price always open | ⚠️ | `Output` is `defaultOpen={false}` (`FilterRail.tsx:238`); no remembered open/closed state (`Section` uses local `useState`, remounts per mobile-dialog open) |
| §1.2 4–7 values per facet, "show top 10 then more" | ✅ | `FilterRail.tsx:131-134, 550-556` |
| §1.3 OR-inside / AND-outside, multi-select | ✅ | `filter.ts:122-161` |
| §1.3 `text only` as a distinct predicate | ❌ | H-05 |
| §1.3 Missing-data policy visible (`N unscored → include`) | ❌ | H-06 |
| §1.3 Boolean facet tri-state incl. "no cache pricing" | ⚠️ | `cache.require` handles unknown; `weights` folds `unknown` — H-04 |
| §1.4 Counts recomputed per state, self-exclusion | ✅ | `facetCounts` with `ignore` (`filter.ts:212-232`) |
| §1.4 Zero-count values dimmed but focusable | ❌ | L-25 |
| §1.4 Never collapse applied state into a number | ✅ | `activeChips` is type+value (`filter.ts:300-370`) |
| §1.5 Sticky applied strip, 2 rows, `+N more` popover, Clear all | ❌ | H-10 |
| §1.6 Dual-thumb log price slider + histogram behind the track | ✅ | `Range log` (`ui/index.tsx:216-257`), `PriceHistogram` |
| §1.6 Histogram 32 px, selected-span tint, tick snapping, editable fields | ❌ | M-12 |
| §1.7 Empty state with ranked repair path and predicted count | ✅ | `App.tsx:713-750`, `diagnose` (`filter.ts:439-451`) — the dossier's own example is nearly verbatim |
| §1.8 Command palette with visible trigger | ❌ | M-21 |
| §2.1 Scatter / bars / gated radar choice | ✅ | `Scatter.tsx`, `RankingBars`, `BenchmarkRadar` |
| §2.2 X log₁₀ blended, axis title states log scale | ✅ | `Scatter.tsx:298-306` |
| §2.2 Pareto frontier overlay | ✅ | `Scatter.tsx:134-140, 234-245` |
| §2.2 Size = context **with 3-item legend** | ⚠️ | Size encoded, legend missing — H-08 |
| §2.2 Open/closed = shape+fill, never hue; **legend truthful** | ❌ | Encoding is right, legend is wrong — H-07 |
| §2.2 Direct labels ≤8, greedy collision avoidance | ⚠️ | Cap of 7 (`Scatter.tsx:166`) but vertical nudge up to ±55 px produces detached/merged labels in the screenshot ("Gemini 4 Agent" + "M2 Wonder") |
| §2.5 Free models in a separate strip, excluded from frontier | ✅ | `Scatter.tsx:82-84, 319-339` (strip below the plot, not above) |
| §2.5 Log-axis title + tick per power of ten | ✅ | `Scatter.tsx:213-232` |
| §2.6 Okabe–Ito, ≤6 families + grey "Other" | ❌ | 8 hashed hues over 58 creators — H-07 |
| §2.7 `figure/figcaption`, "View as table", keyboard roving focus | ❌ | B-02 |
| §3.1 Density ladder, default 40 px, sticky header, virtualised >150 rows | ✅ | `ROW_HEIGHTS` (`ModelTable.tsx:12`), overscan 8, `role="table"` |
| §3.1 9 columns default, 12 max, units in header, 3 sig digits | ⚠️ | 10 default columns; precision issues — L-26 |
| §3.1 Sticky first column, no zebra, 6 % dividers, 4 % hover | ⚠️ | No sticky first column (and no horizontal scroll at all — B-01); dividers/hover compliant |
| §3.2 Skeleton = real geometry, no layout shift | ❌ | M-23 |
| §3.3 Mobile card fallback, bottom sheet with `Show N results` | ❌ | No card fallback (B-01); mobile filter dialog (`App.tsx:433-440`) has no Apply-with-count |
| §4.1–4.4 Preset shape, generated name, JSON import/export with diff | ✅/⚠️ | `presets.ts` + `views.tsx:226-318`; overlap is reported via toast (`App.tsx:161-163`) rather than a diff dialog |
| §4.2 URL: short keys, defaults omitted, `replaceState` 300 ms | ✅ | `url.ts:12-55`, `App.tsx:99-106` |
| §4.2 `pushState` + `popstate`, Copy link | ❌ | M-22 |
| §5.2/5.3 Motion: morph marks, no staggered rows, no row-height animation | ✅ | `motion` transitions on cx/cy, `initial={false}` |
| §5.4 Reduced motion clamped globally | ✅ | `index.css:218-227` + `useReducedMotion` everywhere |
| §7.3 No recommended preset auto-applied | ✅ | Loads unfiltered |
| §7.3 No sorting missing prices as $0 | ✅ | `formatPrice(null)` → `—`; cache `null` → `—` |
| §7.4 Keys never in URL/export | ✅ | `url.ts` has no key fields; `buildConfig` excludes keys (`App.tsx:144-146` toast confirms) |
| §7.5 Variants excluded from scatter/radar | ❌ | H-09 |
| §7.5 Coverage rendered inline, facets gated on it | ✅ | `FilterRail.tsx:117-123, 462` |
| §7.5 3-way openness control, `unknown` surfaced | ❌ | H-04 |

Score: **15 ❌, 8 ⚠️, 21 ✅** against 44 checked rules; everything the dossier specified *analytically* (frontier, diagnostics, counts, log axis, virtualisation, reduced motion) shipped; almost everything it specified *structurally* (width/overflow, sticky planes, ARIA, legends, mobile) did not.

---

## 4. Fix order

1. **B-01** horizontal overflow + mobile cards — the table is the product.
2. **H-03** `--color-fg-dim` → `#8a9099` + bump the three 9–10 px sizes — one CSS line + three class changes, removes every WCAG 1.4.3 failure.
3. **H-04, H-05, H-06** make counts, the text-only filter and threshold coverage honest — three predicate edits, the highest trust-per-line in the list.
4. **H-07, H-08, H-09** chart truth: legend, size key, variant filter.
5. **B-02** keyboard/AT path for the scatter + "View as table".
6. **H-10, M-14** sticky strip + sticky toolbar (one structural pass over `App.tsx`).
7. **M-11, M-12** slider affordances and the price control.
8. **M-15, M-19** ARIA table + the `Clear` chip's false pressed state.
9. **M-13, M-18** pick cards show their score; rename SOM → Match.
10. **M-16, M-17, M-20** radar gating/fake zeros; key validation.
11. **M-21, M-22, M-23** palette, Copy link + popstate, skeleton.
12. **M-24, L-25…L-29** polish.

---

## 5. Machine-readable summary (skill output contract)

```json
{
  "interface_type": "dashboard",
  "interface_type_note": "Dark data-dense comparison dashboard (468 models, 10 facets, scatter + virtualised table + compare view). Parts 1, 2, 4 evaluated; Part 3 for typography/colour and Part 6 for accessibility/trust. Part 5 skipped (no AI-specific signalling).",
  "overall_score": 0,
  "band": "poor",
  "score_note": "Saturated: 2 critical (-30), 8 warning (-56), 19 suggestion (-57) = -143 under the skill's linear model, which assumes <=8 findings. Practical band: fair. Ordered severity profile: 2 blocker / 8 high / 12 medium / 5 low.",
  "findings": [
    {"id": "B-01", "principle": {"code": "F.4.2.01", "slug": "responsive-design", "title": "Responsive Adaptation", "part": "part-4"}, "severity": "critical", "message": "Table columns are clipped with no horizontal scroll below ~1374px viewport; SOM (the default sort column) is unreachable at 1366px and the table is 60% clipped below 1024px. No mobile card fallback.", "remediation": "Wrap header+rows in a min-w-[1038px] div inside overflow-auto; sticky first column; default 9 columns; card list below md.", "business_impact": null},
    {"id": "B-02", "principle": {"code": "F.6.1.01", "slug": "accessibility", "title": "Accessibility", "part": "part-6"}, "severity": "critical", "message": "Scatter marks carry onClick only: no tabIndex/role/aria-label, SVG is role=img, tooltip is hover-only, no figure/figcaption and no table alternative. Keyboard and AT users cannot read or operate the hero chart.", "remediation": "Roving focus with arrow keys, per-mark aria-label, aria-live line, visible focus ring, Table|Chart toggle, figure/figcaption.", "business_impact": null},
    {"id": "H-03", "principle": {"code": "D.2.3.01", "slug": "color-contrast", "title": "Colour Contrast", "part": "part-3"}, "severity": "warning", "message": "--color-fg-dim #6c727c measures 4.08:1 on base, 3.92:1 on panel, 3.72:1 on elevated while carrying every 10px eyebrow, table header, tick and axis title — WCAG 1.4.3 failure on 40+ nodes.", "remediation": "--color-fg-dim: #8a9099 (6.14:1); keep #6c727c as non-text --color-fg-faint; .eyebrow 10->11px; table header 10->11px; chart labels 9.5-10.5->11px.", "business_impact": null},
    {"id": "H-04", "principle": {"code": "C.1.1.01", "slug": "consistency-and-standards", "title": "Consistency and Standards", "part": "part-2"}, "severity": "warning", "message": "Weights facet shows Any 393 / Open 208 / Proprietary 170 but 393-208=185 rows match Proprietary: predicate treats openness=unknown as closed while the numeral counts closed only.", "remediation": "Predicate openness===closed for Proprietary, or add a 4th Unknown(N) bucket; badge unknown rows in the table.", "business_impact": null},
    {"id": "H-05", "principle": {"code": "C.1.4.01", "slug": "error-prevention", "title": "Error Prevention", "part": "part-2"}, "severity": "warning", "message": "\"Text-only\" chip (title: only models that accept text and nothing else) patches input.values=['text'] mode=all, i.e. 'accepts text' — a no-op that returns the same 393 rows.", "remediation": "Implement textOnly as output.length===1 && output[0]==='text' in the Output section; relabel the input chip 'Has text input'.", "business_impact": null},
    {"id": "H-06", "principle": {"code": "C.1.4.01", "slug": "error-prevention", "title": "Missing-data transparency", "part": "part-2"}, "severity": "warning", "message": "Any benchmark threshold silently drops every model without that score (filter.ts value===null -> false) with no 'N models unscored -> include' affordance.", "remediation": "Per-axis hint '211 of 468 models have no score · Include' + includeUnscored predicate + live surviving count.", "business_impact": null},
    {"id": "H-07", "principle": {"code": "C.1.1.01", "slug": "consistency-and-standards", "title": "Truthful Encoding Legend", "part": "part-2"}, "severity": "warning", "message": "Legend renders open as a green dot and closed as a blue ring, but hue encodes creator (8 hashed colours over 58 creators) and fill encodes openness.", "remediation": "Legend: filled=open, ring=proprietary, dashed=frontier + a size key; colour only top-6 creators, grey all others.", "business_impact": null},
    {"id": "H-08", "principle": {"code": "F.1.1.02", "slug": "cognitive-load", "title": "Cognitive Load", "part": "part-1"}, "severity": "warning", "message": "Mark radius encodes context window with no size legend, so the most salient non-positional channel carries no retrievable meaning.", "remediation": "3-item size key (8K/128K/1M) in the card header, or freeze r=4.", "business_impact": null},
    {"id": "H-09", "principle": {"code": "F.1.1.03", "slug": "mental-model", "title": "Mental Model / Data integrity", "part": "part-1"}, "severity": "warning", "message": "alias (19), router (7) and free (18) variants are plotted by default and included in paretoFrontier, so the same model appears twice and pollutes the frontier.", "remediation": "Plot standard variants only; 'Show variants' switch; badge non-standard marks.", "business_impact": null},
    {"id": "H-10", "principle": {"code": "F.2.1.01", "slug": "visible-system-status", "title": "System State Visibility", "part": "part-2"}, "severity": "warning", "message": "Applied-filter strip is not sticky, caps at 8 chips, and '+N more' is an inert span so filters 9+ cannot be removed from it.", "remediation": "sticky top-14 glass strip, two rows, real +N popover, Clear all.", "business_impact": null},
    {"id": "M-11", "principle": {"code": "I.2.2.02", "slug": "fitts-law", "title": "Honest Affordances", "part": "part-4"}, "severity": "suggestion", "message": "Single-valued facets reuse the dual-thumb Range; the left thumb moves and does nothing (cache max, cache discount, up to 11 benchmark axes).", "remediation": "Single-thumb slider variant or a visibly locked left thumb.", "business_impact": null},
    {"id": "M-12", "principle": {"code": "D.2.2.01", "slug": "data-ink-ratio", "title": "Data-Display Fidelity", "part": "part-3"}, "severity": "suggestion", "message": "Price histogram hard-codes width=244 against a ~262px track with no selected-span tint and no editable numeric bounds; default max 5000 vs track max 263 emits a phantom 'blended $0.00-$263.00/1M' chip.", "remediation": "Measure the container; tint in-range bins; 72px number inputs; treat max>=bounds.max as unbounded.", "business_impact": null},
    {"id": "M-13", "principle": {"code": "F.1.1.06", "slug": "serial-position-effect", "title": "Serial Position", "part": "part-1"}, "severity": "suggestion", "message": "Recommendation cards cite 'Top SOM score (81.3)' but show 45.1/$0.525/1.0M, cannot be dismissed, and consume 112px above the table.", "remediation": "Render the cited score on the card, add dismiss + collapse, link to compare.", "business_impact": null},
    {"id": "M-14", "principle": {"code": "F.1.1.02", "slug": "cognitive-load", "title": "Spatial Stability", "part": "part-1"}, "severity": "suggestion", "message": "Three nested scroll planes and a non-sticky toolbar: the sort/density/columns controls scroll away while the table keeps its own scroll.", "remediation": "Sticky toolbar; table inner max-height calc(100dvh-320px).", "business_impact": null},
    {"id": "M-15", "principle": {"code": "F.6.1.01", "slug": "accessibility", "title": "Accessibility (WCAG 1.3.1/4.1.2)", "part": "part-6"}, "severity": "suggestion", "message": "role=table with no columnheader/cell/rowindex and no aria-sort; AT announces anonymous rows.", "remediation": "Real table or full grid ARIA + aria-sort.", "business_impact": null},
    {"id": "M-16", "principle": {"code": "C.1.1.01", "slug": "consistency-and-standards", "title": "Consistency", "part": "part-2"}, "severity": "suggestion", "message": "Compare allows 6 models but the radar slices to 4 with only a 10.5px caption.", "remediation": "Show the gate message + bars fallback, or set MAX_COMPARE=4.", "business_impact": null},
    {"id": "M-17", "principle": {"code": "D.2.2.01", "slug": "data-ink-ratio", "title": "Data Fidelity", "part": "part-3"}, "severity": "suggestion", "message": "Radar plots missing benchmark values as 0, indistinguishable from a measured zero.", "remediation": "Skip/hollow missing vertices; '2/6 axes measured' note.", "business_impact": null},
    {"id": "M-18", "principle": {"code": "F.1.1.03", "slug": "mental-model", "title": "User Vocabulary", "part": "part-1"}, "severity": "suggestion", "message": "'SOM' is the default sort column and is never expanded; its definition lives in a title attribute.", "remediation": "Rename to 'Match', one-line definition under the sort control.", "business_impact": null},
    {"id": "M-19", "principle": {"code": "C.1.1.01", "slug": "consistency-and-standards", "title": "State Language", "part": "part-2"}, "severity": "suggestion", "message": "The 'Clear' chip renders with active/accent styling and aria-pressed=true in the default state.", "remediation": "Render as a ghost text button with no aria-pressed.", "business_impact": null},
    {"id": "M-20", "principle": {"code": "I.1.1.03", "slug": "error-prevention-forms", "title": "Form Error Prevention", "part": "part-4"}, "severity": "suggestion", "message": "Key dialog: no reveal, no validation, stale draft on reopen; a rejected AA key surfaces as 'Benchmark data is not loaded'.", "remediation": "Probe on save with inline ok/401 state, eye toggle, reset draft on open.", "business_impact": null},
    {"id": "M-21", "principle": {"code": "F.2.2.03", "slug": "hicks-law", "title": "Hick's Law", "part": "part-1"}, "severity": "suggestion", "message": "No command palette and no keyboard shortcut surface anywhere in src/.", "remediation": "Header 'Filters & jump to… Cmd K' + palette with @/#/:/ scopes.", "business_impact": null},
    {"id": "M-22", "principle": {"code": "F.2.1.01", "slug": "visible-system-status", "title": "Shareable State", "part": "part-2"}, "severity": "suggestion", "message": "URL state is written with replaceState only; no Copy link, no popstate, so Back leaves the app.", "remediation": "Copy link button, pushState on preset/compare, popstate restore.", "business_impact": null},
    {"id": "M-23", "principle": {"code": "F.2.2.01", "slug": "perceived-performance", "title": "Perceived Performance", "part": "part-2"}, "severity": "suggestion", "message": "Loading is a bare spinner; the full shell mounts after data, producing a whole-page reflow.", "remediation": "Skeleton mirroring rail/cards/chart/table geometry.", "business_impact": null},
    {"id": "M-24", "principle": {"code": "D.2.1.02", "slug": "visual-hierarchy", "title": "Affordance Visibility", "part": "part-3"}, "severity": "suggestion", "message": "Sortable headers are visually identical to disabled ones; direction arrow only appears once active.", "remediation": "Persistent low-contrast sort glyph, non-disabled non-sortable headers, aria-sort.", "business_impact": null},
    {"id": "L-25", "principle": {"code": "F.6.1.01", "slug": "accessibility", "title": "Accessibility", "part": "part-6"}, "severity": "suggestion", "message": "Zero-count facet values are disabled (unfocusable) at opacity-30 = 1.72:1.", "remediation": "aria-disabled + tabIndex + title, opacity-55.", "business_impact": null},
    {"id": "L-26", "principle": {"code": "C.1.1.01", "slug": "consistency-and-standards", "title": "Numeric Consistency", "part": "part-2"}, "severity": "suggestion", "message": "Axis ticks read $0.10/$1.00/$10.0/$100; cache shows $0.0060; context shows 1.0M and 1M in adjacent rows; rationales use 2 decimals against 3 in bodies.", "remediation": "One formatter per quantity, <$0.01 rule, one context rule.", "business_impact": null},
    {"id": "L-27", "principle": {"code": "D.2.2.01", "slug": "data-ink-ratio", "title": "Encoding Legibility", "part": "part-3"}, "severity": "suggestion", "message": "Modality glyphs are single 9px letters (T/I/A/V/F) in 1.16:1 boxes with no legend.", "remediation": "lucide icons at h-3 w-3 with titles.", "business_impact": null},
    {"id": "L-28", "principle": {"code": "D.2.2.01", "slug": "data-ink-ratio", "title": "Chart Chrome", "part": "part-3"}, "severity": "suggestion", "message": "Chart is 380px (min 420), free strip sits below the plot, tooltip has no role and escapes the card at the right edge.", "remediation": "height 440, free band above the plot, clamped tooltip with role=tooltip.", "business_impact": null},
    {"id": "L-29", "principle": {"code": "S.1.3.01", "slug": "ai-transparency", "title": "User Control", "part": "part-5"}, "severity": "suggestion", "message": "No live-API/snapshot switch and no in-app Reduce motion control (dossier S5.4).", "remediation": "Footer popover: Live/Snapshot + Reduce motion System/On/Off.", "business_impact": null}
  ],
  "strengths": [
    {"principle": {"code": "F.1.1.06", "slug": "serial-position-effect", "title": "Empty-state repair path"}, "message": "The 0-result state ranks constraints by marginal removal and offers a one-click Apply with a predicted count — the dossier's own example, implemented better than most commercial catalogues."},
    {"principle": {"code": "D.1.1.01", "slug": "progressive-disclosure", "title": "Faceted counts"}, "message": "Self-excluding facet counts recomputed per state, with zero-count dimming and per-value numerals — the shortest-path signal the dossier asks for."},
    {"principle": {"code": "D.2.2.01", "slug": "data-ink-ratio", "title": "Log price axis + Pareto frontier"}, "message": "Log10 blended price with the scale named in the axis title, per-power ticks, free models kept off the axis instead of clamped, and a real frontier overlay."},
    {"principle": {"code": "F.2.2.01", "slug": "perceived-performance", "title": "Table mechanics"}, "message": "468 rows virtualised with overscan 8, sticky header, three density steps against a fixed row-height map, and no zebra striping."},
    {"principle": {"code": "F.6.1.01", "slug": "accessibility", "title": "Reduced motion"}, "message": "Global prefers-reduced-motion clamp plus per-component useReducedMotion, with marks snapping instead of sliding."}
  ],
  "priority_fixes": ["B-01", "H-03", "H-04", "H-05", "H-06", "H-07", "H-08", "H-09", "B-02", "H-10"],
  "api_enriched": false,
  "api_note": "No UXUI_API_KEY in this environment, so the audit/lookup toolbox was not called; findings come from the skill's offline procedure and the framework's named principles. Install an API key for enriched business-impact citations. Principle codes are nearest-match mappings and were not verified against the API catalogue."
}
```
