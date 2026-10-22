import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  ChevronDown,
  Columns3,
  KeyRound,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";

import { ModelDrawer } from "@/components/ModelDrawer";
import { CompareView, PresetsView } from "@/components/views";
import { KeyDialog } from "@/components/KeyDialog";
import { CostQualityScatter } from "@/components/charts/Scatter";
import { FilterRail } from "@/components/filters/FilterRail";
import { ModelTable } from "@/components/model/ModelTable";
import {
  Badge,
  Button,
  Dialog,
  Popover,
  Segmented,
  Switch,
  Tooltip,
  TooltipProvider,
} from "@/components/ui";
import { formatContext, formatPrice, formatRelative, formatScore } from "@/lib/format";
import {
  SORT_LABELS,
  activeChips,
  applyFilters,
  diagnose,
  facetCounts,
  sortModels,
  type Filters,
  type Sort,
  type SortKey,
} from "@/lib/filter";
import { buildConfig, importConfig, slugifyName } from "@/lib/presets";
import {
  WEIGHT_LABELS,
  computeFitScores,
  paretoFrontier,
  recommend,
} from "@/lib/scoring";
import { STARTER_PRESETS } from "@/lib/starters";
import { decodeState, encodeState } from "@/lib/url";
import type { Catalog } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MAX_COMPARE, DEFAULT_COLUMNS, useSelector, type View } from "@/store/selector";

export default function App() {
  const state = useSelector();
  const {
    catalog,
    status,
    error,
    refreshing,
    filters,
    sort,
    weights,
    view,
    density,
    columns,
    selected,
    presets,
    keys,
    rememberKeys,
  } = state;

  const [keyDialog, setKeyDialog] = useState(false);
  const [inspect, setInspect] = useState<string | null>(null);
  const [mobileFilters, setMobileFilters] = useState(false);
  const booted = useRef(false);
  const reduce = useReducedMotion();

  /* -------------------------------------------------- boot: url, then data */
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const url = decodeState(window.location.search);
    if (url.filters) state.setFilters(url.filters);
    if (url.sort) {
      state.setSort(url.sort.key);
      state.setSortDir(url.sort.dir);
    }
    if (url.weights) state.setWeights(url.weights);
    if (url.view) state.setView(url.view as View);
    if (url.selected) state.setSelected(url.selected);
    void state.hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------- url sync */
  useEffect(() => {
    if (!booted.current) return;
    const timer = setTimeout(() => {
      const query = encodeState({ filters, sort, weights, view, selected });
      window.history.replaceState(null, "", `${window.location.pathname}${query}`);
    }, 350);
    return () => clearTimeout(timer);
  }, [filters, sort, weights, view, selected]);

  const models = catalog?.models ?? [];
  const filtered = useMemo(() => applyFilters(models, filters), [models, filters]);
  const counts = useMemo(() => facetCounts(models, filters), [models, filters]);
  const scoreParts = useMemo(() => computeFitScores(filtered, weights), [filtered, weights]);
  const fitMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const [id, parts] of scoreParts) map.set(id, parts.score);
    return map;
  }, [scoreParts]);
  const sorted = useMemo(() => sortModels(filtered, sort, fitMap), [filtered, sort, fitMap]);
  const frontier = useMemo(() => paretoFrontier(filtered), [filtered]);
  const picks = useMemo(() => recommend(filtered, scoreParts), [filtered, scoreParts]);
  const modelsById = useMemo(() => new Map(models.map((model) => [model.id, model])), [models]);
  const selectedModels = useMemo(
    () => selected.map((id) => modelsById.get(id)).filter((model) => model !== undefined),
    [selected, modelsById],
  );

  const chips = useMemo(() => activeChips(filters), [filters]);
  const diagnosis = useMemo(
    () => (filtered.length === 0 ? diagnose(models, filters) : []),
    [filtered.length, models, filters],
  );

  const patch = useCallback((next: Partial<Filters>) => state.setFilters(next), [state]);
  const reset = useCallback(() => state.resetFilters(), [state]);

  const handleExport = useCallback(() => {
    const config = buildConfig({ filters, sort, weights, view, selected, presets });
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `som-config-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Config exported", {
      description: `${presets.length} presets · keys excluded`,
    });
  }, [filters, sort, weights, view, selected, presets]);

  const handleImport = useCallback(
    (payload: string) => {
      try {
        const parsed = JSON.parse(payload);
        const result = importConfig(parsed, presets);
        if (result.skipped.length) {
          toast.error("Import failed", { description: result.skipped[0].reason });
          return;
        }
        state.applyImportedConfig(result.config);
        const incoming = [...result.groups.new, ...result.groups.update];
        if (incoming.length) state.importPresets(incoming);
        toast.success("Config imported", {
          description: `${result.groups.new.length} new · ${result.groups.update.length} updated · ${result.groups.unchanged.length} unchanged`,
        });
        state.setView("explore");
      } catch {
        toast.error("That file is not valid JSON");
      }
    },
    [presets, state],
  );

  const handleRefresh = useCallback(() => {
    void state.hydrate({ refresh: true });
    toast.message("Refreshing catalogue…", { description: "OpenRouter + Artificial Analysis" });
  }, [state]);

  const loadStarter = useCallback(
    (id: string) => {
      const starter = STARTER_PRESETS.find((entry) => entry.id === id);
      if (!starter) return;
      state.setFilters(starter.filters);
      state.setSortDir(starter.sort.dir);
      state.setSort(starter.sort.key);
      state.setWeights(starter.weights);
      state.setView("explore");
      toast.success(`Loaded “${starter.name}”`);
    },
    [state],
  );

  if (status === "loading" || (status === "idle" && !catalog)) {
    return (
      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
          <p className="text-[12.5px] text-fg-muted">Loading the model catalogue…</p>
        </div>
      </div>
    );
  }

  if (status === "error" || !catalog) {
    return (
      <div className="relative z-10 flex min-h-[100dvh] items-center justify-center p-6">
        <div className="bezel max-w-[440px]">
          <div className="bezel-core p-5">
            <AlertTriangle className="h-5 w-5 text-warn" strokeWidth={1.4} />
            <h1 className="mt-2 text-[15px] font-medium">Catalogue unavailable</h1>
            <p className="mt-1 text-[12.5px] leading-relaxed text-fg-muted">
              {error ?? "The catalogue could not be loaded."} Start the local API with{" "}
              <code className="numeric text-fg">pnpm dev</code> or re-run the snapshot build.
            </p>
            <Button variant="primary" size="sm" className="mt-3" onClick={handleRefresh}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const rail = (
    <FilterRail
      catalog={catalog}
      models={models}
      filters={filters}
      counts={counts}
      onPatch={patch}
      onReset={reset}
      resultCount={filtered.length}
      totalCount={models.length}
    />
  );

  return (
    <TooltipProvider>
      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <a
          href="#results"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-1.5 focus:text-accent-ink"
        >
          Skip to results
        </a>

        <header className="sticky top-0 z-40 glass border-b border-line">
          <div className="mx-auto flex h-14 w-full max-w-[1680px] items-center gap-3 px-3 sm:px-4">
            <a href="#results" className="flex items-center gap-2.5">
              <BrandMark />
              <div className="leading-none">
                <div className="text-[14px] font-semibold tracking-[-0.02em] text-fg">LLM Selector</div>
                <div className="mt-[3px] hidden text-[10px] uppercase tracking-[0.16em] text-fg-dim sm:block">
                  model picker
                </div>
              </div>
            </a>

            <div className="ml-1 hidden md:block">
              <Segmented
                value={view}
                onChange={(next) => state.setView(next)}
                options={[
                  { value: "explore", label: "Explore" },
                  { value: "compare", label: "Compare" },
                  { value: "presets", label: "Presets" },
                ]}
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden items-baseline gap-1.5 sm:flex">
                <span className="numeric text-[13px] text-fg">{filtered.length}</span>
                <span className="numeric text-[11px] text-fg-dim">/ {models.length} models</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileFilters(true)}
                className="inline-flex items-center gap-1.5 rounded-[6px] border border-line px-2 py-1.5 text-[11.5px] text-fg-muted hover:text-fg lg:hidden"
              >
                <SlidersHorizontal className="h-3 w-3" strokeWidth={1.5} /> Filters
                {chips.length > 0 && (
                  <span className="numeric rounded-full bg-accent/20 px-1 text-[10px] text-accent">
                    {chips.length}
                  </span>
                )}
              </button>
              <Tooltip content="Refresh the catalogue and benchmark data">
                <Button size="icon" variant="ghost" onClick={handleRefresh} disabled={refreshing}>
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
                    strokeWidth={1.5}
                  />
                </Button>
              </Tooltip>
              <Button size="sm" variant="outline" onClick={() => setKeyDialog(true)}>
                <KeyRound className="h-3 w-3" strokeWidth={1.5} />
                <span className="hidden sm:inline">
                  {keys.artificialAnalysis || keys.openrouter ? "Keys" : "Connect keys"}
                </span>
              </Button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[1680px] px-3 pb-2 sm:px-4 md:hidden">
            <Segmented
              value={view}
              onChange={(next) => state.setView(next)}
              size="sm"
              options={[
                { value: "explore", label: "Explore" },
                { value: "compare", label: "Compare" },
                { value: "presets", label: "Presets" },
              ]}
            />
          </div>
        </header>

        {chips.length > 0 && (
          <div className="sticky top-14 z-30 glass border-b border-line/60">
            <div className="mx-auto flex w-full max-w-[1680px] flex-wrap items-center gap-1.5 px-3 py-1.5 sm:px-4">
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => state.setFilters(chip.clear(filters))}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2 py-[3px] text-[11px] text-accent transition-colors hover:bg-accent/15"
                >
                  {chip.label}
                  <X className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" strokeWidth={2} />
                </button>
              ))}

              <button
                type="button"
                onClick={reset}
                className="ml-1 text-[11px] text-fg-dim underline decoration-dotted hover:text-fg"
              >
                clear all
              </button>
            </div>
          </div>
        )}

        <main
          id="results"
          className="mx-auto grid w-full max-w-[1680px] flex-1 grid-cols-1 gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[288px_minmax(0,1fr)]"
        >
          <div className="hidden lg:block">
            <div className="sticky top-[68px] max-h-[calc(100dvh-84px)] overflow-hidden">{rail}</div>
          </div>

          <section className="min-w-0">
            {view === "explore" && (
              <ExploreView
                picks={picks}
                filtered={filtered}
                sorted={sorted}
                frontier={frontier}
                fitMap={fitMap}
                sort={sort}
                density={density}
                columns={columns}
                selected={selected}
                diagnosis={diagnosis}
                onPatch={patch}
                onSort={(key) => state.setSort(key)}
                onToggle={state.toggleSelected}
                onInspect={setInspect}
                onReset={reset}
                onDensity={state.setDensity}
                onColumns={(next) => state.setColumns(next)}
                onView={() => state.setView("compare")}
                onExport={handleExport}
                hasBenchmarks={Boolean(catalog.feed)}
                filters={filters}
              />
            )}

            {view === "compare" && (
              <CompareView
                selected={selectedModels}
                candidates={sorted}
                onRemove={state.toggleSelected}
                onOpenSearch={() => state.setView("explore")}
              />
            )}

            {view === "presets" && (
              <PresetsView
                presets={presets}
                starters={STARTER_PRESETS}
                onLoadPreset={state.applyPreset}
                onLoadStarter={loadStarter}
                onDelete={state.deletePreset}
                onSave={(name) => {
                  state.savePreset(name);
                  toast.success("Preset saved", { description: name });
                }}
                onExport={handleExport}
                onImport={handleImport}
                suggestedName={slugifyName(filters)}
                weights={weights as unknown as Record<string, number>}
                onWeights={(next) => state.setWeights(next as unknown as typeof weights)}
                weightLabels={WEIGHT_LABELS}
              />
            )}
          </section>
        </main>

        <Footer catalog={catalog} source={state.source} />

        <ModelDrawer
          model={inspect ? (modelsById.get(inspect) ?? null) : null}
          onClose={() => setInspect(null)}
          onToggle={state.toggleSelected}
          selected={inspect ? selected.includes(inspect) : false}
          canUseApi={state.source === "api"}
        />

        <KeyDialog
          open={keyDialog}
          onOpenChange={setKeyDialog}
          keys={keys}
          remember={rememberKeys}
          serverHasAaKey={Boolean(catalog.feed)}
          onSave={(next, remember) => {
            state.setKeys(next, remember);
            void state.hydrate({ refresh: true });
          }}
        />

        <Dialog
          open={mobileFilters}
          onOpenChange={setMobileFilters}
          title="Filters"
          width={380}
        >
          <div className="max-h-[70vh] overflow-y-auto pr-1">{rail}</div>
        </Dialog>

        <AnimatePresence>
          {selected.length > 0 && view !== "compare" && (
            <motion.div
              initial={{ y: reduce ? 0 : 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: reduce ? 0 : 60, opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.24, ease: [0.22, 0.72, 0.12, 1] }}
              className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2"
            >
              <div className="glass flex items-center gap-2 rounded-full border border-line-strong px-2.5 py-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)]">
                <span className="numeric text-[11px] text-fg-dim">
                  {selected.length}/{MAX_COMPARE}
                </span>
                <div className="flex -space-x-1">
                  {selectedModels.slice(0, 4).map((model) => (
                    <span
                      key={model.id}
                      title={model.name}
                      className="flex h-5 w-5 items-center justify-center rounded-full border border-line-strong bg-elevated text-[9px] uppercase text-fg-muted"
                    >
                      {model.authorLabel.slice(0, 2)}
                    </span>
                  ))}
                </div>
                <Button size="sm" variant="primary" onClick={() => state.setView("compare")}>
                  Compare
                </Button>
                <Button size="icon" variant="ghost" onClick={state.clearSelected} aria-label="Clear">
                  <X className="h-3 w-3" strokeWidth={1.8} />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Toaster theme="dark" position="bottom-right" toastOptions={{ style: { fontSize: 12 } }} />
    </TooltipProvider>
  );
}

/* ------------------------------------------------------------------ explore */

function ExploreView({
  filters,
  picks,
  filtered,
  sorted,
  frontier,
  fitMap,
  sort,
  density,
  columns,
  selected,
  diagnosis,
  onPatch,
  onSort,
  onToggle,
  onInspect,
  onReset,
  onDensity,
  onColumns,
  onView,
  onExport,
  hasBenchmarks,
}: {
  picks: ReturnType<typeof recommend>;
  filtered: ReturnType<typeof applyFilters>;
  sorted: ReturnType<typeof sortModels>;
  frontier: Set<string>;
  fitMap: Map<string, number>;
  sort: Sort;
  density: "compact" | "cozy" | "comfortable";
  columns: typeof DEFAULT_COLUMNS;
  selected: string[];
  diagnosis: ReturnType<typeof diagnose>;
  onPatch: (next: Partial<Filters>) => void;
  onSort: (key: SortKey) => void;
  onToggle: (id: string) => void;
  onInspect: (id: string) => void;
  onReset: () => void;
  onDensity: (density: "compact" | "cozy" | "comfortable") => void;
  onColumns: (next: Partial<typeof DEFAULT_COLUMNS>) => void;
  onView: () => void;
  onExport: () => void;
  hasBenchmarks: boolean;
  filters: Filters;
}) {
  const [chartOpen, setChartOpen] = useState(true);

  return (
    <div>
      <div className="no-scrollbar -mx-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-3 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-4">
        {picks.map((pick) => (
          <button
            key={pick.id}
            type="button"
            onClick={() => onInspect(pick.model.id)}
            className="group relative min-w-[248px] shrink-0 snap-start overflow-hidden rounded-[10px] border border-line bg-white/[0.018] p-3 text-left transition-colors duration-150 hover:border-line-strong hover:bg-white/[0.035] sm:min-w-0"
          >
            <div className="flex items-center justify-between">
              <span className="eyebrow">{pick.title}</span>
              <Sparkles className="h-3 w-3 text-accent/70" strokeWidth={1.3} />
            </div>
            <div className="mt-1.5 truncate text-[13px] text-fg">
              {pick.model.name.replace(/^[^:]+:\s*/, "")}
            </div>
            <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-fg-dim">
              {pick.rationale}
            </div>
            <div className="mt-2 flex items-center gap-2 text-[10.5px] text-fg-muted">
              <span className="numeric">{formatScore(pick.model.benchmarks.intelligence)}</span>
              <span className="text-fg-dim">·</span>
              <span className="numeric">{formatPrice(pick.model.pricing.blended)}</span>
              <span className="text-fg-dim">·</span>
              <span className="numeric">{formatContext(pick.model.contextLength)}</span>
            </div>
          </button>
        ))}
        {picks.length === 0 && (
          <div className="rounded-[10px] border border-dashed border-line p-3 text-[11.5px] text-fg-dim sm:col-span-2 xl:col-span-4">
            No recommendations while the result set is empty.
          </div>
        )}
      </div>

      <div className="bezel mt-3">
        <div className="bezel-core">
          <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[13px] font-medium text-fg">Cost vs quality</h2>
              <span className="hidden text-[11px] text-fg-dim sm:inline">
                {filtered.length} models in view · dotted line = efficient frontier
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Legend />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setChartOpen((open) => !open)}
                aria-label={chartOpen ? "Collapse chart" : "Expand chart"}
              >
                <ChevronDown
                  className={cn("h-3.5 w-3.5 transition-transform duration-200", !chartOpen && "-rotate-90")}
                  strokeWidth={1.5}
                />
              </Button>
            </div>
          </div>
          <AnimatePresence initial={false}>
            {chartOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.26, ease: [0.22, 0.72, 0.12, 1] }}
                className="overflow-hidden"
              >
                <div className="p-2">
                  <CostQualityScatter
                    models={filtered}
                    selected={selected}
                    onToggle={onToggle}
                    frontier={frontier}
                    height={380}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {!hasBenchmarks && (
        <div className="mt-3 flex items-start gap-2 rounded-[8px] border border-warn/25 bg-warn/[0.06] p-2.5">
          <AlertTriangle className="mt-[1px] h-3.5 w-3.5 shrink-0 text-warn" strokeWidth={1.4} />
          <p className="text-[11.5px] leading-relaxed text-fg-muted">
            Benchmark data is not loaded, so only price, modality, openness and context filters can
            rank anything. Add an Artificial Analysis key to unlock the intelligence, coding,
            agentic and domain indices.
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative">
          <select
            value={sort.key}
            onChange={(event) => onSort(event.target.value as SortKey)}
            aria-label="Sort models"
            className="h-7 appearance-none rounded-[6px] border border-line bg-white/[0.03] pl-2.5 pr-7 text-[11.5px] text-fg focus:border-line-strong focus:outline-none"
          >
            {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
              <option key={key} value={key} className="bg-elevated text-fg">
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-fg-dim"
            strokeWidth={1.6}
          />
        </div>
        <Segmented
          size="sm"
          value={density}
          onChange={onDensity}
          options={[
            { value: "compact", label: "Compact" },
            { value: "cozy", label: "Cozy" },
            { value: "comfortable", label: "Roomy" },
          ]}
        />
        <Popover
          width={220}
          trigger={
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-line bg-white/[0.03] px-2 text-[11.5px] text-fg-muted hover:text-fg"
            >
              <Columns3 className="h-3 w-3" strokeWidth={1.5} /> Columns
            </button>
          }
        >
          <div className="space-y-1.5">
            {(
              [
                ["modalities", "Modalities"],
                ["weights", "Weights"],
                ["context", "Context"],
                ["input", "Input price"],
                ["output", "Output price"],
                ["cache", "Cache price"],
                ["intelligence", "Intelligence"],
                ["coding", "Coding"],
                ["speed", "Throughput"],
              ] as const
            ).map(([key, label]) => (
              <Switch
                key={key}
                label={label}
                checked={columns[key]}
                onCheckedChange={(checked) => onColumns({ [key]: checked })}
              />
            ))}
          </div>
        </Popover>
        <Button size="sm" variant="ghost" onClick={onExport}>
          Export config
        </Button>
        {selected.length > 0 && (
          <Button size="sm" variant="subtle" onClick={onView}>
            Compare {selected.length}
          </Button>
        )}
      </div>

      <div className="mt-2.5">
        {sorted.length > 0 ? (
          <ModelTable
            models={sorted}
            sort={sort}
            density={density}
            columns={columns}
            selected={selected}
            fitScores={fitMap}
            onSort={onSort}
            onToggle={onToggle}
            onInspect={onInspect}
            maxHeight={620}
          />
        ) : (
          <div className="bezel">
            <div className="bezel-core p-5">
              <h2 className="text-[14px] font-medium text-fg">No models match these filters</h2>
              <p className="mt-1 text-[12px] text-fg-muted">
                {diagnosis.length
                  ? "Relaxing one of these constraints would bring models back:"
                  : "Every constraint is individually satisfiable, but not together. Start by clearing the search text."}
              </p>
              <ul className="mt-3 space-y-1.5">
                {diagnosis.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-3 rounded-[6px] border border-line px-2.5 py-1.5"
                  >
                    <span className="text-[12px] text-fg-muted">
                      Remove <span className="text-fg">{item.label}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="numeric text-[11px] text-fg-dim">+{item.removed}</span>
                      <Button size="sm" variant="ghost" onClick={() => onPatch(item.filter(filters))}>
                        Apply
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="primary" onClick={onReset}>
                  Clear all filters
                </Button>
                <Button size="sm" variant="outline" onClick={onExport}>
                  Export current config
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="hidden flex-wrap items-center gap-3 text-[10px] text-fg-dim md:flex">
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full bg-accent/40 ring-1 ring-accent" /> filled = open
      </span>
      <span className="flex items-center gap-1">
        <span className="h-2 w-2 rounded-full ring-1 ring-fg-muted" /> ring = proprietary
      </span>
      <span className="flex items-center gap-1">
        <span className="flex items-end gap-[2px]">
          <span className="h-1 w-1 rounded-full bg-fg-dim" />
          <span className="h-1.5 w-1.5 rounded-full bg-fg-dim" />
          <span className="h-2 w-2 rounded-full bg-fg-dim" />
        </span>
        dot size = context
      </span>
      <span className="flex items-center gap-1">
        <span className="h-px w-4 border-t border-dashed border-accent/60" /> frontier
      </span>
      <span className="text-fg-dim/80">colour = lab</span>
    </div>
  );
}

function BrandMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden className="shrink-0">
      <rect x="0.5" y="0.5" width="21" height="21" rx="6.5" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.16)" />
      <circle cx="7" cy="14" r="1.8" fill="#c6f24e" />
      <circle cx="11" cy="9.5" r="1.6" fill="rgba(244,245,247,0.85)" />
      <circle cx="15.5" cy="13" r="1.3" fill="rgba(244,245,247,0.45)" />
      <path d="M7 14L11 9.5L15.5 13" fill="none" stroke="rgba(198,242,78,0.5)" strokeWidth="0.9" />
    </svg>
  );
}

function Footer({ catalog, source }: { catalog: Catalog; source: string | null }) {
  return (
    <footer className="mt-6 border-t border-line">
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-3 px-4 py-5 text-[11px] text-fg-dim sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span>
            Models &amp; pricing:{" "}
            <a href="https://openrouter.ai" target="_blank" rel="noreferrer noopener" className="text-fg-muted underline decoration-dotted hover:text-accent">
              OpenRouter
            </a>
          </span>
          <span className="hidden sm:inline text-fg-dim">·</span>
          <span>
            Benchmarks:{" "}
            <a href="https://artificialanalysis.ai" target="_blank" rel="noreferrer noopener" className="text-fg-muted underline decoration-dotted hover:text-accent">
              Source: Artificial Analysis (artificialanalysis.ai)
            </a>
          </span>
          <span className="hidden sm:inline text-fg-dim">·</span>
          <span>Not endorsed by or affiliated with Artificial Analysis or OpenRouter.</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={source === "api" ? "open" : "neutral"}>{source === "api" ? "live api" : "snapshot"}</Badge>
          <span className="numeric">updated {formatRelative(catalog.generatedAt)}</span>
          {catalog.feed && <Badge tone="accent">AA {catalog.feed.tier}</Badge>}
        </div>
      </div>
    </footer>
  );
}
