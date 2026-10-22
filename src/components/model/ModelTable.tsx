import { ChevronDown, ChevronUp, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge, Tooltip } from "@/components/ui";
import { formatContext, formatPrice, formatScore, formatTps, shortModelName } from "@/lib/format";
import { MODALITY_GLYPH, OPENNESS_HINTS, OPENNESS_LABELS, VARIANT_LABELS } from "@/lib/labels";
import type { Sort, SortKey } from "@/lib/filter";
import type { LlmModel } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ColumnConfig, Density } from "@/store/selector";

const ROW_HEIGHTS: Record<Density, number> = { compact: 32, cozy: 40, comfortable: 48 };
const OVERSCAN = 8;

interface Column {
  key: string;
  label: string;
  hint?: string;
  sortKey?: SortKey;
  align?: "left" | "right";
  width: number;
  hideInConfig?: keyof ColumnConfig;
}

const COLUMNS: Column[] = [
  { key: "model", label: "Model", width: 252 },
  { key: "modalities", label: "In", hint: "Accepted input modalities", width: 92, hideInConfig: "modalities" },
  { key: "weights", label: "Weights", width: 106, hideInConfig: "weights" },
  { key: "context", label: "Context", hint: "Context window in tokens", sortKey: "contextLength", align: "right", width: 82, hideInConfig: "context" },
  { key: "input", label: "$/1M in", hint: "Input price per 1M tokens", sortKey: "price", align: "right", width: 86, hideInConfig: "input" },
  { key: "output", label: "$/1M out", hint: "Output price per 1M tokens", align: "right", width: 94, hideInConfig: "output" },
  { key: "cache", label: "Cache", hint: "Cache-read price per 1M tokens", sortKey: "cacheRead", align: "right", width: 112, hideInConfig: "cache" },
  { key: "intelligence", label: "Intel", hint: "Artificial Analysis intelligence index", sortKey: "intelligence", align: "right", width: 74, hideInConfig: "intelligence" },
  { key: "coding", label: "Code", hint: "Coding index", sortKey: "coding", align: "right", width: 70, hideInConfig: "coding" },
  { key: "speed", label: "Tok/s", hint: "Median output tokens per second", sortKey: "speed", align: "right", width: 72, hideInConfig: "speed" },
  { key: "som", label: "FIT", hint: "Fit score: your weights, ranked within this set", sortKey: "som", align: "right", width: 68 },
];

export interface ModelTableProps {
  models: LlmModel[];
  sort: Sort;
  density: Density;
  columns: ColumnConfig;
  selected: string[];
  fitScores: Map<string, number>;
  onSort: (key: SortKey) => void;
  onToggle: (id: string) => void;
  onInspect: (id: string) => void;
  maxHeight?: number;
}

export function ModelTable({
  models,
  sort,
  density,
  columns,
  selected,
  fitScores,
  onSort,
  onToggle,
  onInspect,
  maxHeight = 560,
}: ModelTableProps) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const rowHeight = ROW_HEIGHTS[density];
  const [viewport, setViewport] = useState(maxHeight);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setViewport(entry.contentRect.height));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const visibleColumns = useMemo(
    () =>
      COLUMNS.filter((column) => {
        if (column.key === "coding") return columns.coding;
        if (!column.hideInConfig) return true;
        return columns[column.hideInConfig];
      }),
    [columns],
  );

  const totalHeight = models.length * rowHeight;
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const end = Math.min(models.length, Math.ceil((scrollTop + viewport) / rowHeight) + OVERSCAN);
  const slice = models.slice(start, end);

  const totalWidth = visibleColumns.reduce((sum, column) => sum + column.width, 0);

  return (
    <div className="rounded-[10px] border border-line bg-white/[0.012]">
      <div
        ref={scroller}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        style={{ maxHeight }}
        className="hidden overflow-auto overscroll-contain md:block"
        role="table"
        aria-rowcount={models.length}
        aria-label="Model catalogue"
      >
      <div style={{ minWidth: totalWidth }}>
      <div className="sticky top-0 z-20 flex items-center border-b border-line bg-base/95 backdrop-blur-sm">
        {visibleColumns.map((column) => {
          const active = column.sortKey && sort.key === column.sortKey;
          return (
            <button
              key={column.key}
              type="button"
              disabled={!column.sortKey}
              onClick={() => column.sortKey && onSort(column.sortKey)}
              style={{ width: column.width, minWidth: column.width }}
              title={column.hint}
              className={cn(
                "group flex h-8 items-center gap-1 px-2 text-[10px] font-medium uppercase tracking-[0.09em]",
                column.key === "model" && "sticky left-0 z-[21] bg-base",
                column.align === "right" ? "justify-end" : "justify-start",
                column.sortKey ? "cursor-pointer hover:text-fg" : "cursor-default",
                active ? "text-accent" : "text-fg-dim",
              )}
            >
              <span className="truncate">{column.label}</span>
              {active &&
                (sort.dir === -1 ? (
                  <ChevronDown className="h-3 w-3" strokeWidth={1.7} />
                ) : (
                  <ChevronUp className="h-3 w-3" strokeWidth={1.7} />
                ))}
            </button>
          );
        })}
      </div>

        <div style={{ height: totalHeight, position: "relative" }}>
          {slice.map((model, index) => {
            const absoluteIndex = start + index;
            const isSelected = selected.includes(model.id);
            return (
              <div
                key={model.id}
                role="row"
                tabIndex={0}
                onClick={() => onInspect(model.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") onInspect(model.id);
                  if (event.key === " ") {
                    event.preventDefault();
                    onToggle(model.id);
                  }
                }}
                style={{
                  position: "absolute",
                  top: absoluteIndex * rowHeight,
                  height: rowHeight,
                  left: 0,
                  right: 0,
                }}
                className={cn(
                  "row-hover flex cursor-pointer items-center border-b border-white/[0.04] text-[12.5px]",
                  isSelected && "bg-accent/[0.055]",
                )}
              >
                {visibleColumns.map((column) => (
                  <div
                    key={column.key}
                    style={{ width: column.width, minWidth: column.width }}
                    className={cn(
                      "flex items-center gap-1.5 px-2",
                      column.align === "right" && "justify-end",
                      column.key === "model" && "sticky left-0 z-[15] bg-[var(--color-base)]",
                    )}
                  >
                    {column.key === "model" && (
                      <ModelCell
                        model={model}
                        selected={isSelected}
                        onToggle={() => onToggle(model.id)}
                      />
                    )}
                    {column.key === "modalities" && (
                      <span className="flex items-center gap-0.5">
                        {model.modalities.input.map((modality) => (
                          <span
                            key={modality}
                            title={modality}
                            className="numeric flex h-[16px] w-[15px] items-center justify-center rounded-[3px] border border-line bg-white/[0.04] text-[9px] uppercase text-fg-muted"
                          >
                            {MODALITY_GLYPH[modality]}
                          </span>
                        ))}
                      </span>
                    )}
                    {column.key === "weights" && (
                      <Tooltip content={OPENNESS_HINTS[model.openness]}>
                        <span className="cursor-help">
                          <Badge tone={model.openness === "open" ? "open" : "closed"}>
                            {OPENNESS_LABELS[model.openness]}
                          </Badge>
                        </span>
                      </Tooltip>
                    )}
                    {column.key === "context" && (
                      <span className="numeric text-fg-muted">{formatContext(model.contextLength)}</span>
                    )}
                    {column.key === "input" && (
                      <span className="numeric text-fg-muted">{formatPrice(model.pricing.prompt)}</span>
                    )}
                    {column.key === "output" && (
                      <span className="numeric text-fg-muted">{formatPrice(model.pricing.completion)}</span>
                    )}
                    {column.key === "cache" && <CacheCell model={model} />}
                    {column.key === "intelligence" && (
                      <ScoreCell value={model.benchmarks.intelligence} />
                    )}
                    {column.key === "coding" && <ScoreCell value={model.benchmarks.coding} />}
                    {column.key === "speed" && (
                      <span className="numeric text-fg-muted">{formatTps(model.speed.outputTokensPerSecond)}</span>
                    )}
                    {column.key === "som" && (
                      <span className="numeric text-[12px] text-accent">
                        {fitScores.get(model.id)?.toFixed(1) ?? "—"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      </div>
      <MobileCards models={models} selected={selected} onToggle={onToggle} onInspect={onInspect} />
    </div>
  );
}

/** Below md the fixed-width grid cannot work, so rows become compact cards. */
function MobileCards({
  models,
  selected,
  onToggle,
  onInspect,
}: {
  models: LlmModel[];
  selected: string[];
  onToggle: (id: string) => void;
  onInspect: (id: string) => void;
}) {
  return (
    <div className="divide-y divide-line/70 md:hidden">
      {models.slice(0, 60).map((model) => (
        <div key={model.id} className="p-2.5">
          <button
            type="button"
            onClick={() => onInspect(model.id)}
            className="flex w-full items-start justify-between gap-2 text-left"
          >
            <span className="min-w-0">
              <span className="block truncate text-[12.5px] text-fg">
                {shortModelName(model.name, model.authorLabel)}
              </span>
              <span className="block truncate text-[10.5px] text-fg-dim">{model.authorLabel}</span>
            </span>
            <Badge tone={model.openness === "open" ? "open" : "closed"}>
              {OPENNESS_LABELS[model.openness]}
            </Badge>
          </button>
          <div className="mt-1.5 grid grid-cols-4 gap-1.5 text-[10.5px]">
            <MobileStat label="Intel" value={formatScore(model.benchmarks.intelligence)} />
            <MobileStat label="Blended" value={formatPrice(model.pricing.blended)} />
            <MobileStat label="Context" value={formatContext(model.contextLength)} />
            <MobileStat label="Cache" value={formatPrice(model.pricing.cacheRead)} />
          </div>
          <button
            type="button"
            onClick={() => onToggle(model.id)}
            className={cn(
              "mt-2 w-full rounded-[5px] border py-1 text-[11px]",
              selected.includes(model.id)
                ? "border-accent/40 bg-accent/10 text-accent"
                : "border-line text-fg-muted",
            )}
          >
            {selected.includes(model.id) ? "In comparison" : "Add to comparison"}
          </button>
        </div>
      ))}
      {models.length > 60 && (
        <p className="p-2.5 text-[11px] text-fg-dim">Showing the first 60 of {models.length} — use filters to narrow.</p>
      )}
    </div>
  );
}

function MobileStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-fg-dim">{label}</div>
      <div className="numeric text-fg">{value}</div>
    </div>
  );
}

function ModelCell({
  model,
  selected,
  onToggle,
}: {
  model: LlmModel;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        aria-label={selected ? "Remove from comparison" : "Add to comparison"}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border transition-colors duration-150",
          selected
            ? "border-accent/50 bg-accent/20 text-accent"
            : "border-line text-fg-dim hover:border-line-strong hover:text-fg",
        )}
      >
        <Star className="h-3 w-3" strokeWidth={1.4} fill={selected ? "currentColor" : "none"} />
      </button>
      <div className="min-w-0 leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[12.5px] text-fg">
            {shortModelName(model.name, model.authorLabel)}
          </span>
          {model.variant !== "standard" && (
            <span className="shrink-0 rounded-[3px] border border-line px-1 text-[9px] uppercase tracking-[0.06em] text-fg-dim">
              {VARIANT_LABELS[model.variant]}
            </span>
          )}
        </div>
        <div className="truncate text-[10.5px] text-fg-dim">{model.authorLabel}</div>
      </div>
    </div>
  );
}

function CacheCell({ model }: { model: LlmModel }) {
  const discount = model.pricing.cacheDiscountPct;
  return (
    <div className="flex items-center gap-1.5">
      <span className="numeric text-fg-muted">{formatPrice(model.pricing.cacheRead)}</span>
      {discount !== null && discount > 0 && (
        <span className="numeric rounded-[3px] border border-open/25 bg-open/10 px-1 text-[9.5px] text-open">
          −{Math.round(discount)}%
        </span>
      )}
    </div>
  );
}

function ScoreCell({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <Tooltip content="Not measured by the current data source">
        <span className="cursor-help text-fg-dim">—</span>
      </Tooltip>
    );
  }
  return <span className="numeric text-fg">{formatScore(value)}</span>;
}
