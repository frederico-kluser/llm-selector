import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";

import { formatContext, formatPrice, formatScore } from "@/lib/format";
import { creatorColor } from "@/components/charts/Scatter";
import type { BenchmarkKey, LlmModel } from "@/lib/types";
import { cn } from "@/lib/utils";

/* --------------------------------------------------------------- radar */

const RADAR_AXES: { key: BenchmarkKey; label: string }[] = [
  { key: "intelligence", label: "Intel" },
  { key: "coding", label: "Coding" },
  { key: "agentic", label: "Agentic" },
  { key: "finance", label: "Finance" },
  { key: "engineering", label: "Eng" },
  { key: "economics", label: "Econ" },
];

/**
 * Radar is deliberately capped at four series and six axes: beyond that the polygon area
 * stops being readable and the ordering of axes starts to imply a shape that isn't there.
 */
export function BenchmarkRadar({
  models,
  size = 300,
}: {
  models: LlmModel[];
  size?: number;
}) {
  const reduce = useReducedMotion();
  const series = models.slice(0, 4);

  const axes = useMemo(
    () =>
      RADAR_AXES.filter(
        (axis) => series.filter((model) => model.benchmarks[axis.key] !== null).length >= 2,
      ),
    [series],
  );

  // Each axis is scaled to the best value in the comparison, so shape differences stay
  // visible instead of every polygon collapsing into the same 0–100 blob.
  const axisMax = useMemo(() => {
    const map = new Map<BenchmarkKey, number>();
    for (const axis of axes) {
      const best = Math.max(
        1,
        ...series.map((model) => model.benchmarks[axis.key] ?? 0),
      );
      map.set(axis.key, best);
    }
    return map;
  }, [axes, series]);

  if (series.length < 2 || axes.length < 3) {
    return (
      <div className="flex h-[260px] items-center justify-center px-6 text-center text-[12px] leading-relaxed text-fg-dim">
        Select two to four models to compare their benchmark profile.
      </div>
    );
  }

  const center = size / 2;
  const radius = center - 42;
  const angleFor = (index: number) => (Math.PI * 2 * index) / axes.length - Math.PI / 2;
  const pointFor = (index: number, value: number) => {
    const angle = angleFor(index);
    const r = (value / 100) * radius;
    return [center + Math.cos(angle) * r, center + Math.sin(angle) * r] as const;
  };

  return (
    <div>
    <svg width={size} height={size} role="img" aria-label="Benchmark profile radar">
      {[25, 50, 75, 100].map((ring) => (
        <circle
          key={ring}
          cx={center}
          cy={center}
          r={(ring / 100) * radius}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeDasharray={ring === 100 ? undefined : "2 4"}
        />
      ))}
      {axes.map((axis, index) => {
        const [x, y] = pointFor(index, 100);
        return (
          <g key={axis.key}>
            <line x1={center} y1={center} x2={x} y2={y} stroke="rgba(255,255,255,0.07)" />
            <text
              x={center + Math.cos(angleFor(index)) * (radius + 20)}
              y={center + Math.sin(angleFor(index)) * (radius + 20) + 3}
              textAnchor="middle"
              className="fill-fg-muted"
              style={{ fontSize: 10 }}
            >
              {axis.label}
            </text>
          </g>
        );
      })}
      {series.map((model) => {
        const color = creatorColor(model.creator);
        const points = axes
          .map((axis, index) =>
            pointFor(index, ((model.benchmarks[axis.key] ?? 0) / (axisMax.get(axis.key) ?? 100)) * 100),
          )
          .map(([x, y]) => `${x},${y}`)
          .join(" ");
        return (
          <motion.polygon
            key={model.id}
            points={points}
            fill={color}
            fillOpacity={0.12}
            stroke={color}
            strokeWidth={1.5}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduce ? 0 : 0.4 }}
          />
        );
      })}
    </svg>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        {series.map((model) => (
          <li key={model.id} className="flex items-center gap-1.5 text-[10px] text-fg-muted">
            <span
              className="h-1.5 w-4 rounded-full"
              style={{ backgroundColor: creatorColor(model.creator) }}
            />
            {model.name.replace(/^[^:]+:\s*/, "").slice(0, 18)}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[10px] leading-relaxed text-fg-dim">
        Each axis is relative to the best model in this comparison.
      </p>
    </div>
  );
}

/* --------------------------------------------------------------- bars */

export function RankingBars({
  models,
  metric,
  selected,
  onToggle,
  limit = 12,
}: {
  models: LlmModel[];
  metric: BenchmarkKey;
  selected: string[];
  onToggle: (id: string) => void;
  limit?: number;
}) {
  const reduce = useReducedMotion();
  const ranked = useMemo(
    () =>
      [...models]
        .filter((model) => model.benchmarks[metric] !== null)
        .sort((a, b) => (b.benchmarks[metric] ?? 0) - (a.benchmarks[metric] ?? 0))
        .slice(0, limit),
    [models, metric, limit],
  );

  if (!ranked.length) {
    return (
      <div className="flex h-[200px] items-center justify-center text-[12px] text-fg-dim">
        No scores for this axis in the current selection.
      </div>
    );
  }

  const max = Math.max(...ranked.map((model) => model.benchmarks[metric] ?? 0), 1);

  return (
    <div className="flex flex-col gap-1">
      {ranked.map((model) => {
        const value = model.benchmarks[metric] ?? 0;
        const isSelected = selected.includes(model.id);
        return (
          <button
            key={model.id}
            type="button"
            onClick={() => onToggle(model.id)}
            className={cn(
              "group flex items-center gap-2.5 rounded-[5px] px-1.5 py-[5px] text-left transition-colors duration-150",
              isSelected ? "bg-accent/10" : "hover:bg-white/[0.04]",
            )}
          >
            <span className="w-[132px] shrink-0 truncate text-[11.5px] text-fg-muted group-hover:text-fg">
              {model.name.replace(/^[^:]+:\s*/, "")}
            </span>
            <span className="relative h-[9px] flex-1 overflow-hidden rounded-full bg-white/[0.05]">
              <motion.span
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ backgroundColor: creatorColor(model.creator) }}
                initial={{ width: 0 }}
                animate={{ width: `${(value / max) * 100}%` }}
                transition={{ duration: reduce ? 0 : 0.6, ease: [0.22, 0.72, 0.12, 1] }}
              />
            </span>
            <span className="numeric w-9 shrink-0 text-right text-[11px] text-fg">{formatScore(value)}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------- histogram */

/** Category histogram drawn behind the price slider track. */
export function PriceHistogram({
  values,
  min,
  max,
  width = 240,
  height = 26,
  bins = 26,
}: {
  values: number[];
  min: number;
  max: number;
  width?: number;
  height?: number;
  bins?: number;
}) {
  const buckets = useMemo(() => {
    const counts = new Array(bins).fill(0);
    if (max <= min) return counts;
    for (const value of values) {
      if (value <= 0) continue;
      const position = (Math.log10(value) - Math.log10(Math.max(min, 0.001))) /
        Math.max(0.0001, Math.log10(max) - Math.log10(Math.max(min, 0.001)));
      const index = Math.min(bins - 1, Math.max(0, Math.floor(position * bins)));
      counts[index] += 1;
    }
    return counts;
  }, [values, min, max, bins]);

  const peak = Math.max(...buckets, 1);
  const barWidth = width / bins;

  return (
    <svg width={width} height={height} aria-hidden className="pointer-events-none">
      {buckets.map((count, index) => (
        <rect
          key={index}
          x={index * barWidth}
          y={height - (count / peak) * height}
          width={Math.max(1, barWidth - 1)}
          height={(count / peak) * height}
          fill="rgba(255,255,255,0.16)"
          rx={1}
        />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------ profile */

/** Compact metric strip used inside cards and the compare tray. */
export function ModelMetrics({ model }: { model: LlmModel }) {
  return (
    <div className="grid grid-cols-4 gap-2 text-[11px]">
      <div>
        <div className="text-fg-dim">Intel</div>
        <div className="numeric text-fg">{formatScore(model.benchmarks.intelligence)}</div>
      </div>
      <div>
        <div className="text-fg-dim">Blended</div>
        <div className="numeric text-fg">{formatPrice(model.pricing.blended)}</div>
      </div>
      <div>
        <div className="text-fg-dim">Context</div>
        <div className="numeric text-fg">{formatContext(model.contextLength)}</div>
      </div>
      <div>
        <div className="text-fg-dim">Cache</div>
        <div className="numeric text-fg">{formatPrice(model.pricing.cacheRead)}</div>
      </div>
    </div>
  );
}
