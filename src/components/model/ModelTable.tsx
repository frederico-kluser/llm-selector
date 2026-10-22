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
  { key: "som", label: "SOM", hint: "Blend of your weights, ranked within this set", sortKey: "som", align: "right", width: 68 },
];

export interface ModelTableProps {
  models: LlmModel[];
  sort: Sort;
  density: Density;
  columns: ColumnConfig;
  selected: string[];
  somScores: Map<string, number>;
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
  somScores,
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

  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-white/[0.012]">
      <div className="sticky top-0 z-10 flex items-center border-b border-line bg-base/95 backdrop-blur-sm">
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

      <div
        ref={scroller}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        style={{ maxHeight }}
        className="overflow-y-auto overscroll-contain"
        role="table"
        aria-rowcount={models.length}
      >
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
                        {somScores.get(model.id)?.toFixed(1) ?? "—"}
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
