import { Activity, KeyRound, Play, Square, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { Badge, Button, EmptyHint, Meter, Tooltip } from "@/components/ui";
import {
  fetchOrBenchmarks,
  fetchProviders,
  type BenchmarkSource,
  type OrBenchmarkFeed,
  type ProviderEndpoint,
} from "@/lib/api";
import { formatLatency, formatPrice, formatScore, formatTps } from "@/lib/format";
import {
  clearProbes,
  latestByModel,
  loadProbes,
  probeModel,
  saveProbe,
  type ProbeResult,
} from "@/lib/probe";
import type { LlmModel } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface ProbeViewProps {
  models: LlmModel[];
  hasKey: boolean;
  onOpenKeys: () => void;
  canUseApi: boolean;
}

/**
 * "Your model" — measure a specific model with the user's own OpenRouter key and compare the
 * measurement against the catalogue's published numbers.
 */
export function ProbeView({ models, hasKey, onOpenKeys, canUseApi }: ProbeViewProps) {
  const [modelId, setModelId] = useState("");
  const [prompt, setPrompt] = useState("Reply with exactly one word: ok");
  const [maxTokens, setMaxTokens] = useState(64);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<ProbeResult[]>([]);
  const [providers, setProviders] = useState<ProviderEndpoint[] | null>(null);
  const [feedSource, setFeedSource] = useState<BenchmarkSource>("design-arena");
  const [feed, setFeed] = useState<OrBenchmarkFeed | null>(null);
  const [feedState, setFeedState] = useState<"idle" | "loading" | "error">("idle");
  const [feedError, setFeedError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => setHistory(loadProbes()), []);
  useEffect(() => {
    setProviders(null);
    if (!canUseApi || !modelId) return;
    let cancelled = false;
    fetchProviders(modelId)
      .then((rows) => !cancelled && setProviders(rows))
      .catch(() => !cancelled && setProviders([]));
    return () => {
      cancelled = true;
    };
  }, [modelId, canUseApi]);

  useEffect(() => {
    if (!hasKey) return;
    let cancelled = false;
    setFeedState("loading");
    setFeedError(null);
    fetchOrBenchmarks(readKey(), feedSource)
      .then((result) => {
        if (cancelled) return;
        setFeed(result);
        setFeedState("idle");
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setFeed(null);
        setFeedError(error.message);
        setFeedState("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedSource, hasKey]);

  const model = useMemo(() => models.find((entry) => entry.id === modelId), [models, modelId]);
  const latest = useMemo(() => latestByModel(history).get(modelId), [history, modelId]);
  const modelHistory = useMemo(
    () => history.filter((entry) => entry.modelId === modelId).slice(0, 6),
    [history, modelId],
  );

  const providerP50 = useMemo(() => {
    if (!providers?.length) return null;
    const throughput = providers.map((p) => p.throughput?.p50).filter((v): v is number => !!v);
    const latency = providers.map((p) => p.latency?.p50).filter((v): v is number => !!v);
    return {
      throughput: throughput.length ? Math.max(...throughput) : null,
      latency: latency.length ? Math.min(...latency) : null,
      count: providers.length,
    };
  }, [providers]);

  async function run() {
    if (!hasKey || !modelId) return;
    const controller = new AbortController();
    abort.current = controller;
    setRunning(true);
    const result = await probeModel({
      apiKey: readKey(),
      modelId,
      prompt,
      maxTokens,
      signal: controller.signal,
    });
    setHistory(saveProbe(result));
    setRunning(false);
    abort.current = null;
  }

  function readKey(): string {
    // The key lives in session/local storage under the same shape the settings dialog writes.
    try {
      const raw = sessionStorage.getItem("llm-selector.keys.v1") ?? localStorage.getItem("llm-selector.keys.v1");
      if (!raw) return "";
      return (JSON.parse(raw) as { openrouter?: string }).openrouter ?? "";
    } catch {
      return "";
    }
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="bezel">
        <div className="bezel-core p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-medium text-fg">Measure your model</h2>
              <p className="mt-1 max-w-[62ch] text-[12px] leading-relaxed text-fg-muted">
                Uses your own OpenRouter key from this browser to run one short streamed
                completion, then reports the latency, throughput and billed cost that actually
                happened — next to the numbers the catalogue publishes.
              </p>
            </div>
            <Badge tone={hasKey ? "open" : "warn"}>
              {hasKey ? "key connected" : "no key"}
            </Badge>
          </div>

          {!hasKey && (
            <div className="mt-3 flex items-center gap-2 rounded-[8px] border border-warn/25 bg-warn/[0.06] p-2.5">
              <KeyRound className="h-3.5 w-3.5 shrink-0 text-warn" strokeWidth={1.4} />
              <p className="text-[11.5px] text-fg-muted">
                Add an OpenRouter key to run a measurement.
              </p>
              <Button size="sm" variant="outline" className="ml-auto" onClick={onOpenKeys}>
                Connect keys
              </Button>
            </div>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-2">
              <label htmlFor="probe-model" className="text-[11.5px] font-medium text-fg-muted">
                Model id
              </label>
              <input
                id="probe-model"
                list="probe-model-options"
                value={modelId}
                onChange={(event) => setModelId(event.target.value.trim())}
                placeholder="e.g. anthropic/claude-opus-5.5"
                spellCheck={false}
                className="numeric h-9 w-full rounded-[6px] border border-line bg-white/[0.03] px-2.5 text-[12px] text-fg placeholder:text-fg-dim focus:border-line-strong focus:outline-none"
              />
              <datalist id="probe-model-options">
                {models.slice(0, 200).map((entry) => (
                  <option key={entry.id} value={entry.id} />
                ))}
              </datalist>
              <div className="flex flex-wrap gap-1.5">
                {["anthropic/claude-opus-5.5", "openai/gpt-6-luna", "deepseek/deepseek-v4.1-flash-1017"].map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setModelId(suggestion)}
                      className="rounded-full border border-line px-2 py-[3px] text-[10.5px] text-fg-dim hover:text-fg"
                    >
                      {suggestion.split("/")[1]}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:w-[190px]">
              <label htmlFor="probe-tokens" className="text-[11.5px] font-medium text-fg-muted">
                Max tokens: {maxTokens}
              </label>
              <input
                id="probe-tokens"
                type="range"
                min={16}
                max={256}
                step={16}
                value={maxTokens}
                onChange={(event) => setMaxTokens(Number(event.target.value))}
                className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[var(--color-accent)]"
              />
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1"
                  disabled={!hasKey || !modelId || running}
                  onClick={run}
                >
                  <Play className="h-3 w-3" strokeWidth={1.6} /> {running ? "Measuring…" : "Measure"}
                </Button>
                {running && (
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label="Cancel"
                    onClick={() => abort.current?.abort()}
                  >
                    <Square className="h-3 w-3" strokeWidth={1.6} />
                  </Button>
                )}
              </div>
            </div>
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer text-[11px] text-fg-dim hover:text-fg">
              Prompt used for the measurement
            </summary>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={2}
              className="mt-2 w-full resize-none rounded-[6px] border border-line bg-white/[0.03] p-2 text-[12px] text-fg focus:border-line-strong focus:outline-none"
            />
          </details>

          {latest && (
            <motion.div
              initial={{ opacity: 0, y: reduce ? 0 : 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-[10px] border border-line bg-white/[0.02] p-3"
            >
              <div className="flex items-center justify-between">
                <span className="eyebrow">Your measurement</span>
                <span className="text-[10.5px] text-fg-dim">
                  {new Date(latest.at).toLocaleTimeString()}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Measure label="TTFT" value={formatLatency((latest.ttftMs ?? 0) / 1000)} />
                <Measure label="Throughput" value={`${formatTps(latest.tokensPerSecond)} tok/s`} />
                <Measure label="Total" value={formatLatency(latest.totalMs / 1000)} />
                <Measure
                  label="Cost"
                  value={latest.costUsd === null ? "—" : `$${latest.costUsd.toFixed(6)}`}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-fg-dim">
                <span>{latest.completionTokens ?? "—"} output tokens</span>
                <span>{latest.promptTokens ?? "—"} input tokens</span>
                {latest.provider && <span>served by {latest.provider}</span>}
                {latest.finishReason && <span>finish: {latest.finishReason}</span>}
              </div>

              {model && (
                <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
                  <CompareRow
                    label="Throughput"
                    yours={latest.tokensPerSecond}
                    reference={providerP50?.throughput ?? model.speed.outputTokensPerSecond}
                    unit="tok/s"
                    higherBetter
                  />
                  <CompareRow
                    label="TTFT"
                    yours={latest.ttftMs === null ? null : latest.ttftMs / 1000}
                    reference={providerP50?.latency ?? model.speed.ttftSeconds}
                    unit="s"
                    higherBetter={false}
                  />
                </div>
              )}
              {!model && (
                <p className="mt-2 text-[11px] text-fg-dim">
                  This id is not in the current catalogue, so it can only be measured — not
                  compared.
                </p>
              )}
            </motion.div>
          )}

          {history[0] && !history[0].ok && history[0].modelId === modelId && (
            <p className="mt-3 rounded-[6px] border border-bad/30 bg-bad/10 p-2 text-[11.5px] text-bad">
              {history[0].error}
            </p>
          )}
        </div>
      </div>

      {model && (
        <div className="panel p-3">
          <div className="flex items-center justify-between">
            <span className="eyebrow">Catalogue view of this model</span>
            <span className="text-[10.5px] text-fg-dim">{model.id}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Measure label="Intelligence" value={formatScore(model.benchmarks.intelligence)} />
            <Measure label="Blended" value={formatPrice(model.pricing.blended)} />
            <Measure label="Cache read" value={formatPrice(model.pricing.cacheRead)} />
            <Measure
              label="Arena Elo"
              value={model.designArena ? String(model.designArena.bestElo) : "—"}
            />
          </div>
          {providerP50 && (
            <p className="mt-2 text-[11px] text-fg-dim">
              Published provider medians across {providerP50.count} providers: up to{" "}
              {Math.round(providerP50.throughput ?? 0)} tok/s, from{" "}
              {formatLatency(providerP50.latency ?? 0)} TTFT.
            </p>
          )}
        </div>
      )}

      <div className="panel p-3">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Measurement history</span>
          {history.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setHistory(clearProbes())}>
              <Trash2 className="h-3 w-3" strokeWidth={1.5} /> Clear
            </Button>
          )}
        </div>
        {modelHistory.length === 0 ? (
          <EmptyHint>
            No measurements yet for this model. Pick a model, run a measurement and it is stored in
            this browser only.
          </EmptyHint>
        ) : (
          <ul className="mt-2 divide-y divide-line/60">
            {modelHistory.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 py-1.5 text-[11.5px]">
                <span className="text-fg-dim">
                  {new Date(entry.at).toLocaleString()}
                </span>
                <span className="numeric flex items-center gap-3 text-fg">
                  <span>{formatTps(entry.tokensPerSecond)} tok/s</span>
                  <span className="text-fg-dim">{formatLatency((entry.ttftMs ?? 0) / 1000)}</span>
                  <span className="text-fg-dim">
                    {entry.costUsd === null ? "—" : `$${entry.costUsd.toFixed(6)}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="bezel">
        <div className="bezel-core p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="eyebrow">OpenRouter benchmark feed</span>
              <p className="mt-1 max-w-[64ch] text-[11.5px] leading-relaxed text-fg-muted">
                OpenRouter publishes Artificial Analysis, Design Arena and its own task benchmarks
                through one endpoint. With your key loaded here, the numbers and the exact citation
                come straight from them.
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ["design-arena", "Design Arena"],
                  ["artificial-analysis", "Artificial Analysis"],
                  ["openrouter", "OpenRouter"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFeedSource(value)}
                  className={cn(
                    "rounded-full px-2.5 py-[3px] text-[11px] transition-colors",
                    feedSource === value ? "bg-accent/15 text-accent" : "text-fg-dim hover:text-fg",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {!hasKey && (
            <p className="mt-2 rounded-[6px] border border-line p-2 text-[11.5px] text-fg-dim">
              Connect an OpenRouter key to load this feed. The catalogue above already includes the
              benchmark fields OpenRouter serves publicly.
            </p>
          )}
          {feedState === "loading" && <p className="mt-2 text-[11.5px] text-fg-dim">Loading feed…</p>}
          {feedState === "error" && (
            <p className="mt-2 rounded-[6px] border border-bad/30 bg-bad/10 p-2 text-[11.5px] text-bad">
              {feedError}
            </p>
          )}

          {feed && feed.rows.length > 0 && (
            <>
              <div className="mt-3 overflow-hidden rounded-[8px] border border-line">
                <table className="w-full border-collapse text-[11.5px]">
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase tracking-[0.08em] text-fg-dim">
                      <th className="p-2 text-left font-medium">Model</th>
                      {feedSource === "design-arena" ? (
                        <>
                          <th className="p-2 text-right font-medium">Category</th>
                          <th className="p-2 text-right font-medium">Elo</th>
                          <th className="p-2 text-right font-medium">Win %</th>
                        </>
                      ) : feedSource === "artificial-analysis" ? (
                        <>
                          <th className="p-2 text-right font-medium">Intel</th>
                          <th className="p-2 text-right font-medium">Coding</th>
                          <th className="p-2 text-right font-medium">Agentic</th>
                        </>
                      ) : (
                        <>
                          <th className="p-2 text-right font-medium">Benchmark</th>
                          <th className="p-2 text-right font-medium">Score</th>
                          <th className="p-2 text-right font-medium">$/task</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {topRows(feed).map((row, index) => (
                      <tr key={index} className={index % 2 === 0 ? "bg-white/[0.015]" : ""}>
                        <td className="max-w-[240px] truncate p-2 text-fg">
                          {String(row.model_name ?? row.name ?? row.model ?? row.permaslug ?? "—")}
                        </td>
                        {feedSource === "design-arena" ? (
                          <>
                            <td className="p-2 text-right text-fg-muted">{String(row.category ?? "—")}</td>
                            <td className="numeric p-2 text-right text-fg">{String(row.elo ?? "—")}</td>
                            <td className="numeric p-2 text-right text-fg-muted">
                              {row.win_rate === undefined || row.win_rate === null ? "—" : String(row.win_rate)}
                            </td>
                          </>
                        ) : feedSource === "artificial-analysis" ? (
                          <>
                            <td className="numeric p-2 text-right text-fg">{num(row.intelligence_index)}</td>
                            <td className="numeric p-2 text-right text-fg-muted">{num(row.coding_index)}</td>
                            <td className="numeric p-2 text-right text-fg-muted">{num(row.agentic_index)}</td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 text-right text-fg-muted">{String(row.benchmark_type ?? "—")}</td>
                            <td className="numeric p-2 text-right text-fg">{num(row.primary_score ?? row.accuracy)}</td>
                            <td className="numeric p-2 text-right text-fg-muted">{money(row.avg_cost_per_task)}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[10.5px] leading-relaxed text-fg-dim">
                {feed.citation ?? "Source: OpenRouter (openrouter.ai/rankings)."}
                {feed.asOf ? ` As of ${feed.asOf}.` : ""} Licensed under CC BY 4.0.
              </p>
            </>
          )}
        </div>
      </div>

      <div className="panel p-3">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-fg-dim" strokeWidth={1.4} />
          <span className="eyebrow">How this compares</span>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-fg-dim">
          A single streamed completion is a smoke test, not a benchmark: network distance, queueing
          and provider routing all move the number. Run it a few times, at different hours, before
          drawing conclusions. The catalogue medians come from OpenRouter&apos;s per-provider
          telemetry; the intelligence and arena scores come from Artificial Analysis and
          OpenRouter&apos;s Design Arena.
        </p>
      </div>
    </div>
  );
}

function num(value: unknown): string {
  return typeof value === "number" ? value.toFixed(1) : "—";
}

function money(value: unknown): string {
  return typeof value === "number" ? `$${value.toFixed(3)}` : "—";
}

function topRows(feed: OrBenchmarkFeed): Record<string, unknown>[] {
  const score = (row: Record<string, unknown>) => {
    if (typeof row.elo === "number") return row.elo;
    if (typeof row.intelligence_index === "number") return row.intelligence_index;
    if (typeof row.primary_score === "number") return row.primary_score * 100;
    if (typeof row.accuracy === "number") return row.accuracy * 100;
    return 0;
  };
  return [...feed.rows].sort((a, b) => score(b) - score(a)).slice(0, 8);
}

function Measure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] text-fg-dim">{label}</div>
      <div className="numeric mt-0.5 text-[13px] text-fg">{value}</div>
    </div>
  );
}

function CompareRow({
  label,
  yours,
  reference,
  unit,
  higherBetter,
}: {
  label: string;
  yours: number | null;
  reference: number | null;
  unit: string;
  higherBetter: boolean;
}) {
  if (yours === null || reference === null) {
    return (
      <div className="text-[11px] text-fg-dim">
        {label}: no reference to compare against
      </div>
    );
  }
  const ratio = higherBetter ? yours / reference : reference / yours;
  const better = ratio >= 1;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[11px]">
        <Tooltip content={`Your measurement versus the published median${higherBetter ? "" : " (lower is better)"}`}>
          <span className="cursor-help text-fg-muted underline decoration-dotted">{label}</span>
        </Tooltip>
        <span className={cn("numeric", better ? "text-open" : "text-warn")}>
          {yours.toFixed(unit === "s" ? 2 : 1)} vs {reference.toFixed(unit === "s" ? 2 : 1)} {unit}
        </span>
      </div>
      <div className="mt-1">
        <Meter value={Math.min(100, ratio * 100)} tone={better ? "open" : "warn"} />
      </div>
    </div>
  );
}
