import { Download, Search, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Badge, Button, Tooltip } from "@/components/ui";
import { ModelMetrics } from "@/components/charts/Charts";
import { BenchmarkRadar, RankingBars } from "@/components/charts/Charts";
import { formatContext, formatPrice, formatScore } from "@/lib/format";
import type { BenchmarkKey, LlmModel } from "@/lib/types";
import { cn } from "@/lib/utils";

const METRICS: { key: BenchmarkKey; label: string }[] = [
  { key: "intelligence", label: "Intelligence" },
  { key: "coding", label: "Coding" },
  { key: "agentic", label: "Agentic" },
  { key: "finance", label: "Finance" },
];

export function CompareView({
  selected,
  candidates,
  onRemove,
  onOpenSearch,
}: {
  selected: LlmModel[];
  candidates: LlmModel[];
  onRemove: (id: string) => void;
  onOpenSearch: () => void;
}) {
  const [metric, setMetric] = useState<BenchmarkKey>("intelligence");

  if (!selected.length) {
    return (
      <div className="bezel mt-6">
        <div className="bezel-core flex flex-col items-center gap-3 px-6 py-16 text-center">
          <div className="grid h-10 w-10 place-items-center rounded-full border border-line text-fg-dim">
            <Search className="h-4 w-4" strokeWidth={1.3} />
          </div>
          <h2 className="text-[15px] font-medium text-fg">Nothing to compare yet</h2>
          <p className="max-w-[46ch] text-[12.5px] leading-relaxed text-fg-muted">
            Star up to six models in the table — or click their points in the scatter — and they
            will line up here on the same axes.
          </p>
          <Button variant="primary" size="sm" onClick={onOpenSearch}>
            Go to the table
          </Button>
        </div>
      </div>
    );
  }

  const rows: { label: string; render: (model: LlmModel) => string }[] = [
    { label: "Intelligence", render: (model) => formatScore(model.benchmarks.intelligence) },
    { label: "Coding", render: (model) => formatScore(model.benchmarks.coding) },
    { label: "Agentic", render: (model) => formatScore(model.benchmarks.agentic) },
    { label: "Input $/1M", render: (model) => formatPrice(model.pricing.prompt) },
    { label: "Output $/1M", render: (model) => formatPrice(model.pricing.completion) },
    { label: "Blended $/1M", render: (model) => formatPrice(model.pricing.blended) },
    { label: "Cache read", render: (model) => formatPrice(model.pricing.cacheRead) },
    {
      label: "Cache saving",
      render: (model) =>
        model.pricing.cacheDiscountPct === null
          ? "—"
          : `${Math.round(model.pricing.cacheDiscountPct)}%`,
    },
    { label: "Context", render: (model) => formatContext(model.contextLength) },
    {
      label: "Throughput",
      render: (model) =>
        model.speed.outputTokensPerSecond ? `${Math.round(model.speed.outputTokensPerSecond)} tok/s` : "—",
    },
    { label: "Weights", render: (model) => (model.openness === "open" ? "open" : "closed") },
    { label: "Input modalities", render: (model) => model.modalities.input.join(" · ") },
  ];

  return (
    <div className="mt-5 space-y-4">
      <div className="bezel">
        <div className="bezel-core p-3">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_1fr]">
            <div>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="eyebrow">Profile</span>
                <span className="text-[10.5px] text-fg-dim">max 4 series</span>
              </div>
              <BenchmarkRadar models={selected} size={300} />
            </div>
            <div className="min-w-0">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="eyebrow">Leaderboard</span>
                <div className="flex flex-wrap gap-1">
                  {METRICS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setMetric(option.key)}
                      className={cn(
                        "rounded-full px-2 py-[3px] text-[10.5px] transition-colors",
                        metric === option.key
                          ? "bg-accent/15 text-accent"
                          : "text-fg-dim hover:text-fg",
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <RankingBars
                models={candidates.length ? candidates : selected}
                metric={metric}
                selected={selected.map((model) => model.id)}
                onToggle={(id) => onRemove(id)}
                limit={10}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bezel">
        <div className="bezel-core overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[12px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-base/95 p-2.5 text-left text-[10px] font-medium uppercase tracking-[0.09em] text-fg-dim">
                  Metric
                </th>
                {selected.map((model) => (
                  <th key={model.id} className="min-w-[150px] p-2.5 text-left align-top">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[12px] font-medium text-fg">
                          {model.name.replace(/^[^:]+:\s*/, "")}
                        </div>
                        <div className="truncate text-[10.5px] text-fg-dim">{model.authorLabel}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemove(model.id)}
                        aria-label={`Remove ${model.name}`}
                        className="text-fg-dim transition-colors hover:text-bad"
                      >
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.label} className={index % 2 === 0 ? "bg-white/[0.014]" : ""}>
                  <td className="sticky left-0 z-10 bg-base/95 p-2.5 text-[11.5px] text-fg-muted">
                    {row.label}
                  </td>
                  {selected.map((model) => (
                    <td key={model.id} className="numeric p-2.5 text-[12px] text-fg">
                      {row.render(model)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {selected.map((model) => (
          <div key={model.id} className="panel p-3">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-[12.5px] text-fg">
                  {model.name.replace(/^[^:]+:\s*/, "")}
                </div>
                <div className="truncate text-[10.5px] text-fg-dim">{model.id}</div>
              </div>
              <Badge tone={model.openness === "open" ? "open" : "closed"}>
                {model.openness === "open" ? "open" : "closed"}
              </Badge>
            </div>
            <ModelMetrics model={model} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ presets view */

export interface PresetsViewProps {
  presets: { id: string; name: string; description?: string; createdAt?: string }[];
  starters: { id: string; name: string; description: string }[];
  onLoadPreset: (id: string) => void;
  onLoadStarter: (id: string) => void;
  onDelete: (id: string) => void;
  onSave: (name: string) => void;
  onExport: () => void;
  onImport: (payload: string) => void;
  suggestedName: string;
  weights: Record<string, number>;
  onWeights: (weights: Record<string, number>) => void;
  weightLabels: { key: string; label: string; hint: string }[];
}

export function PresetsView({
  presets,
  starters,
  onLoadPreset,
  onLoadStarter,
  onDelete,
  onSave,
  onExport,
  onImport,
  suggestedName,
  weights,
  onWeights,
  weightLabels,
}: PresetsViewProps) {
  const [name, setName] = useState(suggestedName);
  const [payload, setPayload] = useState("");
  const fileInput = useRef<HTMLInputElement | null>(null);

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="bezel">
          <div className="bezel-core p-3.5">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Save this view</span>
              <span className="text-[10.5px] text-fg-dim">local to this browser</span>
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-label="Preset name"
                className="h-8 flex-1 rounded-[6px] border border-line bg-white/[0.03] px-2.5 text-[12px] text-fg focus:border-line-strong focus:outline-none"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onSave(name.trim() || suggestedName);
                  setName("");
                }}
              >
                Save preset
              </Button>
            </div>
          </div>
        </div>

        <div className="panel p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="eyebrow">Saved presets</span>
            <span className="numeric text-[10.5px] text-fg-dim">{presets.length}</span>
          </div>
          {presets.length === 0 ? (
            <p className="py-3 text-[12px] text-fg-dim">
              No presets yet. Filter the catalogue, then save the view here — or start from one of
              the curated presets on the right.
            </p>
          ) : (
            <ul className="divide-y divide-line/60">
              {presets.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] text-fg">{entry.name}</div>
                    <div className="truncate text-[10.5px] text-fg-dim">
                      {entry.description || entry.createdAt?.slice(0, 10) || "saved filter set"}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => onLoadPreset(entry.id)}>
                      Load
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete(entry.id)}
                      aria-label={`Delete ${entry.name}`}
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="eyebrow">Curated starters</span>
            <Badge>read-only</Badge>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {starters.map((starter) => (
              <button
                key={starter.id}
                type="button"
                onClick={() => onLoadStarter(starter.id)}
                className="group rounded-[8px] border border-line p-2.5 text-left transition-colors hover:border-line-strong hover:bg-white/[0.03]"
              >
                <div className="text-[12px] font-medium text-fg group-hover:text-accent">
                  {starter.name}
                </div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-fg-dim">
                  {starter.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bezel">
          <div className="bezel-core p-3.5">
            <span className="eyebrow">SOM score weights</span>
            <p className="mt-1 text-[11px] leading-relaxed text-fg-dim">
              Your priorities, applied within the current result set. Nothing is hidden — the score
              only reorders what the filters already allow.
            </p>
            <div className="mt-3 space-y-2.5">
              {weightLabels.map((entry) => (
                <div key={entry.key}>
                  <div className="mb-1 flex items-center justify-between text-[11.5px]">
                    <Tooltip content={entry.hint}>
                      <span className="cursor-help text-fg-muted underline decoration-dotted">
                        {entry.label}
                      </span>
                    </Tooltip>
                    <span className="numeric text-fg-dim">{weights[entry.key]}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={weights[entry.key]}
                    onChange={(event) =>
                      onWeights({ ...weights, [entry.key]: Number(event.target.value) })
                    }
                    aria-label={`${entry.label} weight`}
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--color-accent)]"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel p-3">
          <span className="eyebrow">Config as JSON</span>
          <p className="mt-1 text-[11px] leading-relaxed text-fg-dim">
            Exports filters, sort, score weights, selection and presets. API keys are never
            included.
          </p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" onClick={onExport} className="flex-1">
              <Download className="h-3 w-3" strokeWidth={1.5} /> Export
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInput.current?.click()}
              className="flex-1"
            >
              <Upload className="h-3 w-3" strokeWidth={1.5} /> Import file
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                onImport(await file.text());
                event.target.value = "";
              }}
            />
          </div>
          <textarea
            value={payload}
            onChange={(event) => setPayload(event.target.value)}
            placeholder="…or paste a config here"
            aria-label="Paste config JSON"
            className="numeric mt-2 h-24 w-full resize-none rounded-[6px] border border-line bg-white/[0.03] p-2 text-[11px] text-fg placeholder:text-fg-dim focus:border-line-strong focus:outline-none"
          />
          <Button
            size="sm"
            variant="subtle"
            className="mt-2 w-full"
            disabled={!payload.trim()}
            onClick={() => {
              onImport(payload);
              setPayload("");
            }}
          >
            Apply pasted config
          </Button>
        </div>
      </div>
    </div>
  );
}
