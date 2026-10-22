import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";

import { PriceHistogram } from "@/components/charts/Charts";
import {
  Button,
  Chip,
  EmptyHint,
  Label,
  Range,
  Section,
  Segmented,
  SingleRange,
  Switch,
  Tooltip,
} from "@/components/ui";
import { formatCompactPrice, formatContext, formatPrice, formatScore } from "@/lib/format";
import {
  DEFAULT_FILTERS,
  PRICE_AXES,
  type FacetCounts,
  type Filters,
  type PriceAxis,
} from "@/lib/filter";
import { BENCHMARK_LABELS } from "@/lib/labels";
import type { BenchmarkKey, Catalog, LlmModel, Modality, OutputModality } from "@/lib/types";
import { cn } from "@/lib/utils";

const INPUT_MODALITIES: { id: Modality; label: string; hint: string }[] = [
  { id: "text", label: "Text", hint: "Accepts text prompts" },
  { id: "image", label: "Image", hint: "Accepts image input (vision)" },
  { id: "audio", label: "Audio", hint: "Accepts audio input" },
  { id: "video", label: "Video", hint: "Accepts video input" },
  { id: "file", label: "File", hint: "Accepts files/PDFs" },
];

const OUTPUT_MODALITIES: { id: OutputModality; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "image", label: "Image" },
  { id: "audio", label: "Audio" },
  { id: "embeddings", label: "Embeddings" },
];

const FEATURES: { id: string; label: string; hint: string }[] = [
  { id: "tools", label: "Tools", hint: "Function/tool calling supported" },
  { id: "structured", label: "Structured output", hint: "JSON schema constrained output" },
  { id: "reasoning", label: "Reasoning", hint: "Exposes a reasoning/thinking mode" },
  { id: "web_search", label: "Web search", hint: "Priced web-search plugin" },
  { id: "prompt_cache", label: "Prompt cache", hint: "Has a published cache-read price" },
  { id: "long_context", label: "200K+ context", hint: "Context window of at least 200k tokens" },
];

const CONTEXT_PRESETS = [
  { value: 0, label: "Any" },
  { value: 32_000, label: "32K" },
  { value: 128_000, label: "128K" },
  { value: 200_000, label: "200K" },
  { value: 1_000_000, label: "1M" },
];

const PRICE_PRESETS = [
  { value: 0.5, label: "≤ $0.50" },
  { value: 1, label: "≤ $1" },
  { value: 2.5, label: "≤ $2.50" },
  { value: 5, label: "≤ $5" },
  { value: 15, label: "≤ $15" },
];

const AGE_PRESETS = [
  { value: 0, label: "Any" },
  { value: 30, label: "30d" },
  { value: 90, label: "90d" },
  { value: 180, label: "6mo" },
  { value: 365, label: "1y" },
];

export interface FilterRailProps {
  catalog: Catalog;
  models: LlmModel[];
  filters: Filters;
  counts: FacetCounts;
  onPatch: (patch: Partial<Filters>) => void;
  onReset: () => void;
  resultCount: number;
  totalCount: number;
}

export function FilterRail({
  catalog,
  models,
  filters,
  counts,
  onPatch,
  onReset,
  resultCount,
  totalCount,
}: FilterRailProps) {
  const [showAllCreators, setShowAllCreators] = useState(false);

  const priceBounds = useMemo(() => {
    const values = models
      .map((model) =>
        filters.price.axis === "prompt"
          ? model.pricing.prompt
          : filters.price.axis === "completion"
            ? model.pricing.completion
            : model.pricing.blended,
      )
      .filter((value): value is number => value !== null && value > 0)
      .sort((a, b) => a - b);
    if (!values.length) return { min: 0.01, max: 100, values: [] as number[] };
    return {
      min: Math.max(0.005, values[0]),
      max: Math.max(values[values.length - 1], 1),
      values,
    };
  }, [models, filters.price.axis]);

  const availableBenchmarks = useMemo(
    () =>
      catalog.benchmarks
        .filter((benchmark) => (benchmark.coverage ?? 0) > 0)
        .sort((a, b) => (b.coverage ?? 0) - (a.coverage ?? 0)),
    [catalog.benchmarks],
  );

  const coreBenchmarks = availableBenchmarks.filter((b) => b.family === "core");
  const domainBenchmarks = availableBenchmarks.filter((b) => b.family === "domain");
  const otherBenchmarks = availableBenchmarks.filter(
    (b) => b.family !== "core" && b.family !== "domain",
  );

  const creators = useMemo(() => {
    const visible = catalog.creators.filter((creator) => (counts.creators[creator.id] ?? 0) > 0);
    return showAllCreators ? visible : visible.slice(0, 10);
  }, [catalog.creators, counts.creators, showAllCreators]);

  const toggleInput = (modality: Modality) => {
    const values = filters.input.values.includes(modality)
      ? filters.input.values.filter((item) => item !== modality)
      : [...filters.input.values, modality];
    onPatch({ input: { ...filters.input, values } });
  };

  const setMin = (key: BenchmarkKey, value: number) => {
    const mins = { ...filters.mins };
    if (value <= 0) delete mins[key];
    else mins[key] = value;
    onPatch({ mins });
  };

  return (
    <aside className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="flex items-baseline gap-1.5">
          <span className="eyebrow">Filters</span>
          <span className="numeric text-[11px] text-fg-muted">
            {resultCount}
            <span className="text-fg-dim">/{totalCount}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] text-fg-dim transition-colors hover:text-fg"
        >
          Reset
        </button>
      </div>

      <div className="relative px-1 pb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-dim" strokeWidth={1.3} />
        <input
          value={filters.q}
          onChange={(event) => onPatch({ q: event.target.value })}
          placeholder="Search models…"
          aria-label="Search models"
          className="h-8 w-full rounded-[6px] border border-line bg-white/[0.03] pl-8 pr-7 text-[12.5px] text-fg placeholder:text-fg-dim focus:border-line-strong focus:outline-none"
        />
        {filters.q && (
          <button
            type="button"
            onClick={() => onPatch({ q: "" })}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-dim hover:text-fg"
          >
            <X className="h-3 w-3" strokeWidth={1.6} />
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-16">
        <Section title="Input modalities">
          <div className="flex flex-wrap gap-1.5">
            {INPUT_MODALITIES.map((modality) => (
              <Chip
                key={modality.id}
                active={filters.input.values.includes(modality.id)}
                count={counts.input[modality.id] ?? 0}
                dimmed={(counts.input[modality.id] ?? 0) === 0}
                disabled={(counts.input[modality.id] ?? 0) === 0 && !filters.input.values.includes(modality.id)}
                onClick={() => toggleInput(modality.id)}
                title={modality.hint}
              >
                {modality.label}
              </Chip>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-fg-dim">
              {filters.input.mode === "all" ? "Must accept all" : "Accepts any"}
            </span>
            <Segmented
              size="sm"
              value={filters.input.mode}
              onChange={(mode) => onPatch({ input: { ...filters.input, mode } })}
              options={[
                { value: "all", label: "ALL", title: "Model must accept every selected modality" },
                { value: "any", label: "ANY", title: "Model must accept at least one" },
              ]}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip
              active={filters.textOnly}
              onClick={() => onPatch({ textOnly: !filters.textOnly })}
              title="Models that accept text and nothing else, and return only text"
            >
              Text-only
            </Chip>
            <Chip
              active={filters.input.values.length === 0}
              onClick={() => onPatch({ input: { mode: "all", values: [] } })}
            >
              Clear
            </Chip>
          </div>
        </Section>

        <Section title="Output" defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {OUTPUT_MODALITIES.map((modality) => (
              <Chip
                key={modality.id}
                active={filters.output.includes(modality.id)}
                count={counts.output[modality.id] ?? 0}
                dimmed={(counts.output[modality.id] ?? 0) === 0}
                onClick={() =>
                  onPatch({
                    output: filters.output.includes(modality.id)
                      ? filters.output.filter((item) => item !== modality.id)
                      : [...filters.output, modality.id],
                  })
                }
              >
                {modality.label}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Weights">
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: "any", label: "Any" },
                { id: "open", label: "Open" },
                { id: "closed", label: "Proprietary" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => onPatch({ weights: option.id })}
                className={cn(
                  "rounded-[6px] border px-2 py-1.5 text-[11.5px] transition-colors duration-150",
                  filters.weights === option.id
                    ? "border-accent/40 bg-accent/12 text-accent"
                    : "border-line bg-white/[0.02] text-fg-muted hover:text-fg",
                )}
              >
                {option.label}
                <span className="numeric ml-1 text-[10px] text-fg-dim">
                  {option.id === "any"
                    ? (counts.weights.open ?? 0) +
                      (counts.weights.closed ?? 0) +
                      (counts.weights.unknown ?? 0)
                    : (counts.weights[option.id] ?? 0)}
                  {option.id === "any" && (counts.weights.unknown ?? 0) > 0 ? ` (${counts.weights.unknown} unknown)` : ""}
                </span>
              </button>
            ))}
          </div>
          <EmptyHint>
            Open = weights published (Hugging Face id or an explicit open-weight claim). Models with
            no signal are counted as proprietary only when the lab never ships weights.
          </EmptyHint>
        </Section>

        <Section title="Price">
          <div className="mb-2 flex items-center justify-between">
            <Segmented
              size="sm"
              value={filters.price.axis}
              onChange={(axis: PriceAxis) =>
                onPatch({ price: { ...filters.price, axis } })
              }
              options={PRICE_AXES.map((axis) => ({
                value: axis.id,
                label: axis.label,
                title: axis.hint,
              }))}
            />
            <Tooltip content="3:1 blend = (3 × input + output) / 4, the industry convention for a typical token mix.">
              <span className="cursor-help text-[10px] text-fg-dim underline decoration-dotted">?</span>
            </Tooltip>
          </div>

          <div className="relative mb-1.5 overflow-hidden rounded-[4px]">
            <div className="absolute inset-x-0 bottom-0">
              <PriceHistogram
                values={priceBounds.values}
                min={priceBounds.min}
                max={priceBounds.max}
                width={244}
                height={24}
              />
            </div>
            <div className="relative pt-1">
              <Range
                log
                value={[filters.price.min, Math.min(filters.price.max, priceBounds.max)]}
                min={priceBounds.min}
                max={priceBounds.max}
                onValueChange={([min, max]) =>
                  onPatch({
                    price: {
                      ...filters.price,
                      min,
                      // snap to the sentinel when the thumb is at the far end, so a no-op
                      // drag does not emit a phantom "price ≤ $263" chip
                      max: max >= priceBounds.max ? DEFAULT_FILTERS.price.max : max,
                      freeOnly: false,
                    },
                  })
                }
                ariaLabel={["Minimum price", "Maximum price"]}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className="numeric text-fg-muted">{formatPrice(filters.price.min)}</span>
            <span className="text-fg-dim">per 1M tokens</span>
            <span className="numeric text-fg-muted">
              {formatPrice(Math.min(filters.price.max, priceBounds.max))}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {PRICE_PRESETS.map((preset) => (
              <Chip
                key={preset.value}
                active={filters.price.max === preset.value && filters.price.min === 0}
                onClick={() =>
                  onPatch({
                    price: { ...filters.price, min: 0, max: preset.value, freeOnly: false },
                  })
                }
              >
                {preset.label}
              </Chip>
            ))}
            <Chip
              active={filters.price.freeOnly}
              onClick={() =>
                onPatch({ price: { ...filters.price, freeOnly: !filters.price.freeOnly } })
              }
            >
              Free
            </Chip>
          </div>

          <div className="mt-2.5">
            <Switch
              label="Include models without a published price"
              checked={filters.price.includeUnpriced}
              onCheckedChange={(includeUnpriced) =>
                onPatch({ price: { ...filters.price, includeUnpriced } })
              }
            />
          </div>
        </Section>

        <Section title="Cache pricing">
          <Switch
            label="Has cache-read pricing"
            checked={filters.cache.require}
            onCheckedChange={(require) => onPatch({ cache: { ...filters.cache, require } })}
          />
          {filters.cache.require && (
            <>
              <div className="mt-2.5">
                <Label hint={`≤ ${formatPrice(filters.cache.max)}`}>Max cache-read price</Label>
                <Range
                  log
                  value={[0.01, Math.min(filters.cache.max, 20)]}
                  min={0.01}
                  max={20}
                  onValueChange={([, max]) =>
                    onPatch({ cache: { ...filters.cache, max } })
                  }
                  ariaLabel={["Minimum", "Maximum cache price"]}
                />
              </div>
            </>
          )}
          <div className="mt-2.5">
            <Label hint={filters.cache.minDiscount ? `≥ ${filters.cache.minDiscount}%` : "off"}>
              Cache saves at least
            </Label>
            <SingleRange
              value={filters.cache.minDiscount}
              min={0}
              max={100}
              step={5}
              onValueChange={(minDiscount) =>
                onPatch({ cache: { ...filters.cache, minDiscount } })
              }
            />
          </div>
          <EmptyHint>
            {counts.weights.open ?? 0} models publish a cache-read price. Values are USD per 1M
            cached tokens.
          </EmptyHint>
        </Section>

        <Section title="Context window">
          <div className="flex flex-wrap gap-1.5">
            {CONTEXT_PRESETS.map((preset) => (
              <Chip
                key={preset.value}
                active={filters.minContext === preset.value}
                onClick={() => onPatch({ minContext: preset.value })}
              >
                {preset.label}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Benchmarks">
          {availableBenchmarks.length === 0 ? (
            <EmptyHint>
              No benchmark data loaded. Add an Artificial Analysis key to unlock intelligence,
              coding, agentic and domain indices.
            </EmptyHint>
          ) : (
            <>
              <div className="mb-2">
                <Switch
                  label="Only scored models"
                  checked={filters.requireScored}
                  onCheckedChange={(requireScored) => onPatch({ requireScored })}
                />
              </div>
              <div className="space-y-2.5">
                {[...coreBenchmarks, ...domainBenchmarks].map((benchmark) => {
                  const value = filters.mins[benchmark.key] ?? 0;
                  return (
                    <div key={benchmark.key}>
                      <Label
                        hint={value > 0 ? `≥ ${value} · ${benchmark.coverage} models` : `${benchmark.coverage ?? 0} models`}
                      >
                        {BENCHMARK_LABELS[benchmark.key] ?? benchmark.label}
                      </Label>
                      <SingleRange
                        value={value}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={(next) => setMin(benchmark.key, next)}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[10.5px] leading-relaxed text-fg-dim">
                Floors hide models with no score on that axis — they are excluded, not treated as
                zero.
              </p>
              {otherBenchmarks.length > 0 && (
                <details className="mt-2.5">
                  <summary className="cursor-pointer text-[11px] text-fg-dim hover:text-fg">
                    {otherBenchmarks.length} more axes
                  </summary>
                  <div className="mt-2 space-y-2.5">
                    {otherBenchmarks.map((benchmark) => {
                      const value = filters.mins[benchmark.key] ?? 0;
                      return (
                        <div key={benchmark.key}>
                          <Label hint={`≥ ${value}`}>{BENCHMARK_LABELS[benchmark.key] ?? benchmark.label}</Label>
                          <SingleRange
                            value={value}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(next) => setMin(benchmark.key, next)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}
            </>
          )}
        </Section>

        <Section title="Capabilities" defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {FEATURES.map((feature) => (
              <Chip
                key={feature.id}
                active={filters.features.includes(feature.id)}
                count={counts.features[feature.id] ?? 0}
                dimmed={(counts.features[feature.id] ?? 0) === 0}
                onClick={() =>
                  onPatch({
                    features: filters.features.includes(feature.id)
                      ? filters.features.filter((item) => item !== feature.id)
                      : [...filters.features, feature.id],
                  })
                }
                title={feature.hint}
              >
                {feature.label}
              </Chip>
            ))}
          </div>
        </Section>

        <Section title="Provider" defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {creators.map((creator) => (
              <Chip
                key={creator.id}
                active={filters.creators.includes(creator.id)}
                count={counts.creators[creator.id] ?? 0}
                dimmed={(counts.creators[creator.id] ?? 0) === 0}
                onClick={() =>
                  onPatch({
                    creators: filters.creators.includes(creator.id)
                      ? filters.creators.filter((item) => item !== creator.id)
                      : [...filters.creators, creator.id],
                  })
                }
              >
                {creator.label}
              </Chip>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowAllCreators((value) => !value)}
            className="mt-2 text-[11px] text-fg-dim hover:text-fg"
          >
            {showAllCreators ? "Show fewer" : `Show all ${catalog.creators.length}`}
          </button>
        </Section>

        <Section title="Freshness & variants" defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {AGE_PRESETS.map((preset) => (
              <Chip
                key={preset.value}
                active={filters.maxAgeDays === preset.value}
                onClick={() => onPatch({ maxAgeDays: preset.value })}
              >
                {preset.label}
              </Chip>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            <Switch
              label="Hide deprecated"
              checked={filters.hideDeprecated}
              onCheckedChange={(hideDeprecated) => onPatch({ hideDeprecated })}
            />
            <Switch
              label="Hide “-latest” aliases"
              checked={filters.hideAliases}
              onCheckedChange={(hideAliases) => onPatch({ hideAliases })}
            />
            <Switch
              label="Hide batch variants"
              checked={filters.hideBatch}
              onCheckedChange={(hideBatch) => onPatch({ hideBatch })}
            />
            <Switch
              label="Hide :free variants"
              checked={filters.hideFree}
              onCheckedChange={(hideFree) => onPatch({ hideFree })}
            />
          </div>
        </Section>

        <div className="px-1 pt-4">
          <Button variant="ghost" size="sm" className="w-full" onClick={onReset}>
            Reset all filters
          </Button>
        </div>
      </div>
    </aside>
  );
}

export function describeContext(value: number) {
  return value ? formatContext(value) : "any";
}

export function priceLabel(value: number | null) {
  return value === null ? "—" : formatCompactPrice(value);
}

export function scoreLabel(value: number | null) {
  return value === null ? "—" : formatScore(value);
}
