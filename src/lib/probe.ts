/**
 * Bring-your-own-key performance probe.
 *
 * The browser talks to OpenRouter directly (their API sends `Access-Control-Allow-Origin: *`),
 * so the user's key never passes through our server. We stream one short completion and
 * measure what actually happened: time to first token, end-to-end latency, output tokens per
 * second, token counts and the exact billed cost that OpenRouter reports in `usage`.
 */

export interface ProbeResult {
  id: string;
  modelId: string;
  at: string;
  ok: boolean;
  ttftMs: number | null;
  totalMs: number;
  tokensPerSecond: number | null;
  promptTokens: number | null;
  completionTokens: number | null;
  costUsd: number | null;
  provider: string | null;
  generationId: string | null;
  finishReason: string | null;
  error: string | null;
}

const OPENROUTER_CHAT = "https://openrouter.ai/api/v1/chat/completions";
const STORAGE = "llm-selector.probes.v1";
const MAX_HISTORY = 80;

export interface ProbeOptions {
  apiKey: string;
  modelId: string;
  prompt?: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export async function probeModel({
  apiKey,
  modelId,
  prompt = "Reply with exactly one word: ok",
  maxTokens = 64,
  temperature = 0,
  signal,
}: ProbeOptions): Promise<ProbeResult> {
  const started = { at: new Date().toISOString(), t0: performance.now() };
  const base: ProbeResult = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    modelId,
    at: started.at,
    ok: false,
    ttftMs: null,
    totalMs: 0,
    tokensPerSecond: null,
    promptTokens: null,
    completionTokens: null,
    costUsd: null,
    provider: null,
    generationId: null,
    finishReason: null,
    error: null,
  };

  if (!apiKey) {
    return { ...base, totalMs: 0, error: "No OpenRouter key — add one first." };
  }

  try {
    const response = await fetch(OPENROUTER_CHAT, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-OpenRouter-Title": "LLM Selector probe",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: prompt }],
        max_tokens: maxTokens,
        temperature,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      let detail = text.slice(0, 220);
      try {
        const json = JSON.parse(text) as { error?: { message?: string } };
        if (json?.error?.message) detail = json.error.message;
      } catch {
        // keep the raw text
      }
      const hint =
        response.status === 401
          ? "OpenRouter rejected the key."
          : response.status === 402
            ? "Not enough credits on this key."
            : response.status === 429
              ? "Rate limited by the provider."
              : `HTTP ${response.status}`;
      return {
        ...base,
        totalMs: Math.round(performance.now() - started.t0),
        error: `${hint} ${detail}`.trim(),
      };
    }

    const provider = response.headers.get("x-provider-name");
    const generationId = response.headers.get("x-generation-id");
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    let buffer = "";
    let ttftMs: number | null = null;
    let usage: {
      prompt_tokens?: number;
      completion_tokens?: number;
      cost?: number;
    } | null = null;
    let finishReason: string | null = null;
    let sawContent = false;

    while (reader) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const chunk = JSON.parse(payload) as {
            choices?: { delta?: { content?: string | null }; finish_reason?: string | null }[];
            usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number } | null;
            error?: { message?: string };
          };
          if (chunk.error?.message) {
            return {
              ...base,
              totalMs: Math.round(performance.now() - started.t0),
              provider,
              generationId,
              error: chunk.error.message,
            };
          }
          const delta = chunk.choices?.[0]?.delta?.content;
          if (!sawContent && typeof delta === "string" && delta.length > 0) {
            sawContent = true;
            ttftMs = Math.round(performance.now() - started.t0);
          }
          if (chunk.choices?.[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason;
          if (chunk.usage) usage = chunk.usage;
        } catch {
          // ignore keep-alive comments and partial JSON
        }
      }
    }

    const totalMs = Math.round(performance.now() - started.t0);
    const completionTokens = usage?.completion_tokens ?? null;
    const windowMs = ttftMs === null ? totalMs : Math.max(1, totalMs - ttftMs);
    const tokensPerSecond =
      completionTokens !== null && completionTokens > 0
        ? Math.round((completionTokens / (windowMs / 1000)) * 10) / 10
        : null;

    return {
      ...base,
      ok: true,
      ttftMs,
      totalMs,
      tokensPerSecond,
      promptTokens: usage?.prompt_tokens ?? null,
      completionTokens,
      costUsd: typeof usage?.cost === "number" ? usage.cost : null,
      provider,
      generationId,
      finishReason,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ...base,
      totalMs: Math.round(performance.now() - started.t0),
      error: message === "The operation was aborted." ? "Cancelled." : message,
    };
  }
}

/* --------------------------------------------------------------- storage */

export function loadProbes(): ProbeResult[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ProbeResult[]) : [];
  } catch {
    return [];
  }
}

export function saveProbe(result: ProbeResult): ProbeResult[] {
  const next = [result, ...loadProbes()].slice(0, MAX_HISTORY);
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(next));
    } catch {
      // storage full or blocked — the measurement still shows in this session
    }
  }
  return next;
}

export function clearProbes(): ProbeResult[] {
  if (typeof localStorage !== "undefined") localStorage.removeItem(STORAGE);
  return [];
}

export function latestByModel(probes: ProbeResult[]): Map<string, ProbeResult> {
  const map = new Map<string, ProbeResult>();
  for (const probe of probes) {
    if (!probe.ok) continue;
    if (!map.has(probe.modelId)) map.set(probe.modelId, probe);
  }
  return map;
}
