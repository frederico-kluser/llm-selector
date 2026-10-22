import { motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { formatContext, formatPrice, formatScore } from "@/lib/format";
import type { LlmModel } from "@/lib/types";
import { cn, hashIndex } from "@/lib/utils";

/** Okabe–Ito, ordered for maximum separation on a dark surface. */
export const CREATOR_COLORS = [
  "#56b4e9",
  "#e69f00",
  "#4ec9a0",
  "#d55e00",
  "#cc79a7",
  "#9ecbff",
  "#f0e442",
  "#b7b7b7",
];

export function creatorColor(creator: string) {
  return CREATOR_COLORS[hashIndex(creator, CREATOR_COLORS.length)];
}

export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, ...size };
}

const PAD = { top: 18, right: 22, bottom: 34, left: 46 };

export interface ScatterProps {
  models: LlmModel[];
  selected: string[];
  onToggle: (id: string) => void;
  frontier: Set<string>;
  height?: number;
}

interface Plotted {
  model: LlmModel;
  x: number;
  y: number;
  r: number;
  color: string;
}

/**
 * Cost vs quality scatter. X is a log10 blended price — free models live in a separate
 * strip because $0 has no place on a log axis and clamping them would be a lie.
 */
export function CostQualityScatter({
  models,
  selected,
  onToggle,
  frontier,
  height = 400,
}: ScatterProps) {
  const { ref, width } = useMeasure<HTMLDivElement>();
  const [hover, setHover] = useState<{ model: LlmModel; x: number; y: number } | null>(null);
  const reduce = useReducedMotion();
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = Math.max(0, height - PAD.top - PAD.bottom);

  const { points, free, xTicks, yTicks, xDomain, yDomain } = useMemo(() => {
    const paid: Plotted[] = [];
    const freeModels: LlmModel[] = [];
    for (const model of models) {
      const price = model.pricing.blended;
      const quality = model.benchmarks.intelligence;
      if (price === null || quality === null) continue;
      if (price <= 0) {
        freeModels.push(model);
        continue;
      }
      paid.push({
        model,
        x: Math.log10(price),
        y: quality,
        r: 3 + Math.min(5, Math.sqrt(model.contextLength / 1_000_000) * 3.2),
        color: creatorColor(model.creator),
      });
    }
    if (!paid.length) {
      return { points: [], free: freeModels, xTicks: [], yTicks: [], xDomain: [-2, 2], yDomain: [0, 100] };
    }
    const xs = paid.map((p) => p.x);
    const ys = paid.map((p) => p.y);
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.max(0, Math.min(...ys) - 4);
    const yMax = Math.min(100, Math.max(...ys) + 4);
    const ticks: number[] = [];
    for (let power = -3; power <= 3; power += 1) {
      const value = power;
      if (value >= xMin - 0.35 && value <= xMax + 0.35) ticks.push(value);
    }
    const yStep = yMax - yMin > 60 ? 20 : yMax - yMin > 30 ? 10 : 5;
    const yTickValues: number[] = [];
    for (let value = Math.ceil(yMin / yStep) * yStep; value <= yMax; value += yStep) {
      yTickValues.push(value);
    }
    return {
      points: paid,
      free: freeModels,
      xTicks: ticks,
      yTicks: yTickValues,
      xDomain: [xMin - 0.15, xMax + 0.15] as [number, number],
      yDomain: [yMin, yMax] as [number, number],
    };
  }, [models]);

  const scaleX = useCallback(
    (value: number) =>
      PAD.left + ((value - xDomain[0]) / Math.max(0.001, xDomain[1] - xDomain[0])) * innerW,
    [xDomain, innerW],
  );
  const scaleY = useCallback(
    (value: number) =>
      PAD.top + innerH - ((value - yDomain[0]) / Math.max(0.001, yDomain[1] - yDomain[0])) * innerH,
    [yDomain, innerH],
  );

  const frontierPath = useMemo(() => {
    const nodes = points
      .filter((point) => frontier.has(point.model.id))
      .sort((a, b) => a.x - b.x)
      .map((point) => `${scaleX(point.x)},${scaleY(point.y)}`);
    return nodes.length > 1 ? `M${nodes.join("L")}` : "";
  }, [points, frontier, scaleX, scaleY]);

  /**
   * Direct labels are placed greedily: highest-quality points first, each label nudged
   * vertically until it no longer collides with one already placed. Anything that cannot be
   * placed cleanly is dropped — silence beats overlapping text.
   */
  const labelled = useMemo(() => {
    const placed = new Map<string, { x: number; y: number }>();
    const occupied: { x1: number; x2: number; y1: number; y2: number }[] = [];
    const ranked = [...points]
      .filter((point) => point.model.benchmarks.intelligence !== null)
      .sort((a, b) => (b.model.benchmarks.intelligence ?? 0) - (a.model.benchmarks.intelligence ?? 0))
      .slice(0, 18);
    let placedCount = 0;
    for (const point of ranked) {
      const text = point.model.name.replace(/^[^:]+:\s*/, "");
      const label = text.length > 18 ? `${text.slice(0, 17)}…` : text;
      const width = label.length * 5.1;
      const baseX = scaleX(point.x) + point.r + 4;
      const baseY = scaleY(point.y);
      for (const offset of [0, -11, 11, -22, 22, -33, 33, -44, 44, -55, 55]) {
        const box = { x1: baseX - 2, x2: baseX + width + 2, y1: baseY - 6 + offset, y2: baseY + 8 + offset };
        const clash = occupied.some(
          (other) => box.x1 < other.x2 && box.x2 > other.x1 && box.y1 < other.y2 && box.y2 > other.y1,
        );
        if (!clash && placedCount < 7) {
          occupied.push(box);
          placed.set(point.model.id, { x: baseX, y: baseY + 3 + offset });
          placedCount += 1;
          break;
        }
      }
    }
    return placed;
  }, [points, scaleX, scaleY]);

  if (!points.length) {
    return (
      <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-center">
        <p className="text-[13px] text-fg-muted">No priced, benchmarked models in this selection</p>
        <p className="max-w-[42ch] text-[11.5px] leading-relaxed text-fg-dim">
          The scatter needs both a price and an intelligence score. Loosen the price cap or add an
          Artificial Analysis key to score more models.
        </p>
      </div>
    );
  }

  return (
    <figure ref={ref} className="relative m-0 w-full">
      <figcaption className="sr-only">
        Scatter plot of blended price in US dollars per million tokens on a logarithmic horizontal
        axis against the intelligence index on the vertical axis. Each mark is a model and can be
        focused with the keyboard; the table below lists the same models with sortable columns.
      </figcaption>
      <svg
        width={width || 600}
        height={height}
        role="group"
        aria-label="Blended price versus intelligence index, log scale"
      >
        {yTicks.map((tick) => (
          <g key={`y${tick}`}>
            <line
              x1={PAD.left}
              x2={PAD.left + innerW}
              y1={scaleY(tick)}
              y2={scaleY(tick)}
              stroke="rgba(255,255,255,0.055)"
              strokeDasharray="2 4"
            />
            <text
              x={PAD.left - 8}
              y={scaleY(tick) + 3}
              textAnchor="end"
              className="numeric fill-fg-dim"
              style={{ fontSize: 10 }}
            >
              {tick}
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <g key={`x${tick}`}>
            <line
              x1={scaleX(tick)}
              x2={scaleX(tick)}
              y1={PAD.top}
              y2={PAD.top + innerH}
              stroke="rgba(255,255,255,0.05)"
            />
            <text
              x={scaleX(tick)}
              y={PAD.top + innerH + 15}
              textAnchor="middle"
              className="numeric fill-fg-dim"
              style={{ fontSize: 10 }}
            >
              {formatPrice(10 ** tick, 2)}
            </text>
          </g>
        ))}

        {frontierPath && (
          <motion.path
            d={frontierPath}
            fill="none"
            stroke="rgba(198,242,78,0.55)"
            strokeWidth={1.25}
            strokeDasharray="4 4"
            initial={{ pathLength: reduce ? 1 : 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reduce ? 0 : 0.7, ease: "easeOut" }}
          />
        )}

        {points.map((point) => {
          const isSelected = selected.includes(point.model.id);
          const isFrontier = frontier.has(point.model.id);
          const cx = scaleX(point.x);
          const cy = scaleY(point.y);
          const open = point.model.openness === "open";
          return (
            <g key={point.model.id}>
              <motion.circle
                role="button"
                tabIndex={0}
                aria-label={`${point.model.name}, intelligence ${formatScore(point.model.benchmarks.intelligence)}, blended ${formatPrice(point.model.pricing.blended)} per million tokens, context ${formatContext(point.model.contextLength)}${isSelected ? ", in comparison" : ""}`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onToggle(point.model.id);
                  }
                }}
                cx={cx}
                cy={cy}
                r={point.r}
                fill={open ? point.color : "transparent"}
                fillOpacity={open ? 0.32 : 0}
                stroke={point.color}
                strokeWidth={isSelected ? 2 : 1.1}
                strokeOpacity={open ? 0.95 : 0.8}
                style={{ cursor: "pointer" }}
                initial={false}
                animate={{ cx, cy, scale: isSelected ? 1.25 : 1 }}
                transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 0.72, 0.12, 1] }}
                onMouseEnter={(event) => {
                  const rect = (event.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setHover({
                    model: point.model,
                    x: event.clientX - rect.left,
                    y: event.clientY - rect.top,
                  });
                }}
                onMouseLeave={() => setHover(null)}
                onClick={() => onToggle(point.model.id)}
              />
              {isFrontier && (
                <circle cx={cx} cy={cy} r={point.r + 3.5} fill="none" stroke="rgba(198,242,78,0.28)" strokeWidth={1} />
              )}
              {labelled.has(point.model.id) && (
                <text
                  x={labelled.get(point.model.id)!.x}
                  y={labelled.get(point.model.id)!.y}
                  className="fill-fg-muted pointer-events-none"
                  style={{ fontSize: 9.5 }}
                >
                  {point.model.name.replace(/^[^:]+:\s*/, "").length > 18
                    ? `${point.model.name.replace(/^[^:]+:\s*/, "").slice(0, 17)}…`
                    : point.model.name.replace(/^[^:]+:\s*/, "")}
                </text>
              )}
            </g>
          );
        })}

        <text
          x={PAD.left + innerW / 2}
          y={height - 4}
          textAnchor="middle"
          className="fill-fg-dim"
          style={{ fontSize: 10.5, letterSpacing: "0.04em" }}
        >
          BLENDED PRICE $/1M TOKENS — LOG SCALE
        </text>
        <text
          x={11}
          y={PAD.top + innerH / 2}
          textAnchor="middle"
          transform={`rotate(-90 11 ${PAD.top + innerH / 2})`}
          className="fill-fg-dim"
          style={{ fontSize: 10.5, letterSpacing: "0.04em" }}
        >
          INTELLIGENCE INDEX
        </text>
      </svg>
      <p className="mt-1 text-[10px] text-fg-dim">
        {selected.length > 0 ? `${selected.length} selected — ` : ""}keyboard: tab to a mark, Enter
        adds it to the comparison.
      </p>

      {free.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-fg-dim">
          <span className="eyebrow mr-1 text-[9px]">free tier ({free.length})</span>
          {free.slice(0, 4).map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => onToggle(model.id)}
              className={cn(
                "rounded-[4px] border px-1.5 py-[1px] transition-colors",
                selected.includes(model.id)
                  ? "border-accent/40 text-accent"
                  : "border-line text-fg-muted hover:text-fg",
              )}
            >
              {model.name.replace(/^[^:]+:\s*/, "").slice(0, 18)}
            </button>
          ))}
          {free.length > 4 && <span>+{free.length - 4} not on the log axis</span>}
        </div>
      )}

      {hover && (
        <div
          className="pointer-events-none absolute z-30 w-[248px] -translate-x-1/2 rounded-[8px] border border-line-strong bg-elevated/97 p-2.5 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.95)]"
          style={{ left: hover.x, top: Math.max(8, hover.y - 78) }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[12px] font-medium text-fg">{hover.model.name}</span>
            <span className={cn("text-[9px] uppercase tracking-[0.1em]", hover.model.openness === "open" ? "text-open" : "text-fg-dim")}>
              {hover.model.openness === "open" ? "open" : hover.model.openness === "closed" ? "closed" : "?"}
            </span>
          </div>
          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
            <Metric label="Intel" value={formatScore(hover.model.benchmarks.intelligence)} />
            <Metric label="Blended" value={formatPrice(hover.model.pricing.blended)} />
            <Metric label="Context" value={formatContext(hover.model.contextLength)} />
            <Metric label="Cache" value={formatPrice(hover.model.pricing.cacheRead)} />
          </div>
        </div>
      )}
    </figure>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-fg-dim">{label}</span>
      <span className="numeric text-fg">{value}</span>
    </div>
  );
}
