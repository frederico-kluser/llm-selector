import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Copy, ExternalLink, Star, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge, Button, Meter, Switch } from "@/components/ui";
import { fetchProviders, type ProviderEndpoint } from "@/lib/api";
import {
  formatContext,
  formatDate,
  formatLatency,
  formatPrice,
  formatScore,
  formatTps,
} from "@/lib/format";
import { BENCHMARK_LABELS, FEATURE_LABELS, OPENNESS_HINTS, OPENNESS_LABELS } from "@/lib/labels";
import type { BenchmarkKey, LlmModel } from "@/lib/types";
import { cn } from "@/lib/utils";

const AXIS_ORDER: BenchmarkKey[] = [
  "intelligence",
  "coding",
  "agentic",
  "finance",
  "strategy",
  "legal",
  "healthcare",
  "engineering",
  "economics",
  "terminalbench",
  "gpqa",
  "hle",
  "scicode",
  "ifbench",
  "lcr",
  "tau2",
  "tauBanking",
];

export function ModelDrawer({
  model,
  onClose,
  onToggle,
  selected,
  canUseApi,
}: {
  model: LlmModel | null;
  onClose: () => void;
  onToggle: (id: string) => void;
  selected: boolean;
  canUseApi: boolean;
}) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [providers, setProviders] = useState<ProviderEndpoint[] | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [showProviders, setShowProviders] = useState(false);

  useEffect(() => {
    setCopied(false);
    setProviders(null);
    setProviderError(null);
    setShowProviders(false);
  }, [model?.id]);

  useEffect(() => {
    if (!model || !showProviders || !canUseApi || providers) return;
    let cancelled = false;
    fetchProviders(model.id)
      .then((endpoints) => {
        if (!cancelled) setProviders(endpoints);
      })
      .catch((error: Error) => {
        if (!cancelled) setProviderError(error.message);
      });
    return () => {
      cancelled = true;
    };
  }, [model, showProviders, canUseApi, providers]);

  const open = Boolean(model);
  const scored = model
    ? AXIS_ORDER.map((key) => ({ key, value: model.benchmarks[key] })).filter(
        (entry) => entry.value !== null,
      )
    : [];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <AnimatePresence>
        {open && model && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.16 }}
                className="fixed inset-0 z-[75] bg-black/55"
              />
            </DialogPrimitive.Overlay>
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                initial={{ x: reduce ? 0 : 520, opacity: reduce ? 0 : 1 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: reduce ? 0 : 520, opacity: reduce ? 0 : 1 }}
                transition={{ duration: reduce ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="fixed inset-y-0 right-0 z-[76] flex w-full max-w-[520px] flex-col border-l border-line-strong bg-base/97 backdrop-blur-xl"
              >
                <div className="flex items-start justify-between gap-3 border-b border-line p-4">
                  <div className="min-w-0">
                    <DialogPrimitive.Title className="truncate text-[15px] font-medium tracking-[-0.02em] text-fg">
                      {model.name}
                    </DialogPrimitive.Title>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(model.id);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 1600);
                      }}
                      className="numeric mt-1 flex items-center gap-1 text-[11px] text-fg-dim transition-colors hover:text-fg"
                    >
                      {model.id}
                      {copied ? <Check className="h-3 w-3" strokeWidth={1.6} /> : <Copy className="h-3 w-3" strokeWidth={1.4} />}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon"
                      variant={selected ? "primary" : "outline"}
                      onClick={() => onToggle(model.id)}
                      title={selected ? "Remove from comparison" : "Add to comparison"}
                      aria-label={selected ? "Remove from comparison" : "Add to comparison"}
                    >
                      <Star className="h-3.5 w-3.5" strokeWidth={1.5} fill={selected ? "currentColor" : "none"} />
                    </Button>
                    <DialogPrimitive.Close asChild>
                      <Button size="icon" variant="ghost" aria-label="Close">
                        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
                      </Button>
                    </DialogPrimitive.Close>
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={model.openness === "open" ? "open" : "closed"} title={OPENNESS_HINTS[model.openness]}>
                      {OPENNESS_LABELS[model.openness]}
                    </Badge>
                    {model.variant !== "standard" && <Badge>{model.variant}</Badge>}
                    {model.features.slice(0, 4).map((feature) => (
                      <Badge key={feature}>{FEATURE_LABELS[feature] ?? feature}</Badge>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                    <Stat label="Provider" value={model.authorLabel} />
                    <Stat label="Released" value={formatDate(model.created)} />
                    <Stat label="Context" value={formatContext(model.contextLength)} />
                    <Stat
                      label="Max output"
                      value={model.maxOutputTokens ? formatContext(model.maxOutputTokens) : "—"}
                    />
                    <Stat label="Knowledge cutoff" value={model.knowledgeCutoff ?? "—"} />
                    <Stat
                      label="Throughput"
                      value={
                        model.speed.outputTokensPerSecond
                          ? `${formatTps(model.speed.outputTokensPerSecond)} tok/s`
                          : "—"
                      }
                    />
                  </div>

                  <h3 className="eyebrow mb-2 mt-5">Pricing (USD per 1M tokens)</h3>
                  <div className="overflow-hidden rounded-[8px] border border-line">
                    {[
                      ["Input", model.pricing.prompt],
                      ["Output", model.pricing.completion],
                      ["Blended 3:1", model.pricing.blended],
                      ["Cache read", model.pricing.cacheRead],
                      ["Cache write", model.pricing.cacheWrite],
                      ["Cache write (1h)", model.pricing.cacheWrite1h],
                      ["Web search", model.pricing.webSearch],
                      ["Image", model.pricing.image],
                      ["Audio", model.pricing.audio],
                    ].map(([label, value], index) => (
                      <div
                        key={String(label)}
                        className={cn(
                          "flex items-center justify-between px-2.5 py-1.5 text-[12px]",
                          index % 2 === 0 ? "bg-white/[0.018]" : "bg-transparent",
                        )}
                      >
                        <span className="text-fg-muted">{label}</span>
                        <span className="numeric text-fg">{formatPrice(value as number | null)}</span>
                      </div>
                    ))}
                  </div>
                  {model.pricing.cacheDiscountPct !== null && model.pricing.cacheDiscountPct > 0 && (
                    <p className="mt-1.5 text-[11px] text-open">
                      Cache hits are {Math.round(model.pricing.cacheDiscountPct)}% cheaper than fresh
                      input.
                    </p>
                  )}

                  <h3 className="eyebrow mb-2 mt-5">Benchmarks</h3>
                  {scored.length === 0 ? (
                    <p className="text-[11.5px] leading-relaxed text-fg-dim">
                      No benchmark row matched this model. Open a key dialog to load Artificial
                      Analysis data, or treat the model as unbenchmarked.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {scored.map(({ key, value }) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="w-[136px] shrink-0 truncate text-[11.5px] text-fg-muted">
                            {(BENCHMARK_LABELS[key] ?? key).replace(" ≥", "")}
                          </span>
                          <div className="flex-1">
                            <Meter value={value ?? 0} />
                          </div>
                          <span className="numeric w-9 text-right text-[11px] text-fg">
                            {formatScore(value)}
                          </span>
                        </div>
                      ))}
                      {model.aa && (
                        <p className="pt-1 text-[10.5px] leading-relaxed text-fg-dim">
                          Matched to “{model.aa.name}” ({model.aa.confidence} confidence). Source:
                          Artificial Analysis.
                        </p>
                      )}
                    </div>
                  )}

                  {model.designArena && (
                    <>
                      <h3 className="eyebrow mb-2 mt-5">Design Arena · OpenRouter</h3>
                      <p className="mb-2 text-[11px] leading-relaxed text-fg-dim">
                        Best {model.designArena.bestElo} Elo · avg {model.designArena.avgElo} ·
                        rank #{model.designArena.bestRank ?? "—"} ·{" "}
                        {model.designArena.samples} categories
                      </p>
                      <div className="overflow-hidden rounded-[8px] border border-line">
                        {model.designArena.categories.slice(0, 6).map((row, index) => (
                          <div
                            key={`${row.arena}-${row.category}`}
                            className={cn(
                              "flex items-center justify-between px-2.5 py-1.5 text-[11.5px]",
                              index % 2 === 0 ? "bg-white/[0.018]" : "",
                            )}
                          >
                            <span className="truncate text-fg-muted">
                              {row.category}
                              <span className="ml-1 text-fg-dim">· {row.arena}</span>
                            </span>
                            <span className="numeric flex shrink-0 gap-3 text-fg">
                              <span>{row.elo ?? "—"}</span>
                              <span className="text-fg-dim">
                                {row.winRate !== null ? `${row.winRate}%` : "—"}
                              </span>
                              <span className="text-fg-dim">#{row.rank ?? "—"}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <h3 className="eyebrow mb-2 mt-5">Capabilities</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {model.features.length === 0 && (
                      <span className="text-[11.5px] text-fg-dim">No declared capabilities</span>
                    )}
                    {model.features.map((feature) => (
                      <span
                        key={feature}
                        className="rounded-full border border-line px-2 py-[3px] text-[11px] text-fg-muted"
                      >
                        {FEATURE_LABELS[feature] ?? feature}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <h3 className="eyebrow">Providers</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] text-fg-dim">live stats</span>
                      <Switch
                        checked={showProviders}
                        onCheckedChange={setShowProviders}
                        label=""
                      />
                    </div>
                  </div>
                  {showProviders && (
                    <div className="mt-2">
                      {!canUseApi && (
                        <p className="text-[11px] text-fg-dim">
                          Provider stats need the llm-selector API server. Run <code className="numeric">pnpm dev</code>.
                        </p>
                      )}
                      {providerError && <p className="text-[11px] text-bad">{providerError}</p>}
                      {!providers && !providerError && canUseApi && (
                        <p className="text-[11px] text-fg-dim">Loading providers…</p>
                      )}
                      {providers?.length === 0 && (
                        <p className="text-[11px] text-fg-dim">No provider endpoints published.</p>
                      )}
                      <div className="space-y-1.5">
                        {providers?.slice(0, 10).map((provider) => (
                          <div
                            key={`${provider.tag}-${provider.quantization}`}
                            className="flex items-center justify-between rounded-[6px] border border-line px-2 py-1.5 text-[11.5px]"
                          >
                            <span className="truncate text-fg-muted">{provider.providerName}</span>
                            <span className="numeric flex shrink-0 items-center gap-3 text-fg-dim">
                              <span>{provider.throughput ? `${Math.round(provider.throughput.p50)} tok/s` : "—"}</span>
                              <span>{provider.latency ? formatLatency(provider.latency.p50) : "—"}</span>
                              <span className="text-fg">{formatPrice(provider.pricing?.prompt ? Number(provider.pricing.prompt) * 1_000_000 : null)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-line p-3">
                  <a
                    href={`https://openrouter.ai/${model.cleanId}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 text-[11.5px] text-fg-muted transition-colors hover:text-accent"
                  >
                    Open on OpenRouter
                    <ExternalLink className="h-3 w-3" strokeWidth={1.4} />
                  </a>
                </div>
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10.5px] text-fg-dim">{label}</div>
      <div className="mt-[1px] truncate text-fg">{value}</div>
    </div>
  );
}
