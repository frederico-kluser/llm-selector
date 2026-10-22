/** Presentation helpers. Every formatter is null-safe: missing data renders as an em dash. */

export const DASH = "—";

export function formatPrice(perMillion: number | null | undefined, digits = 2): string {
  if (perMillion === null || perMillion === undefined || Number.isNaN(perMillion)) return DASH;
  if (perMillion === 0) return "$0";
  if (perMillion < 0.01) return `$${perMillion.toFixed(4)}`;
  if (perMillion < 1) return `$${perMillion.toFixed(3).replace(/0$/, "")}`;
  if (perMillion < 10) return `$${perMillion.toFixed(digits)}`;
  if (perMillion < 100) return `$${perMillion.toFixed(1)}`;
  return `$${Math.round(perMillion)}`;
}

export function formatCompactPrice(perMillion: number | null | undefined): string {
  if (perMillion === null || perMillion === undefined) return DASH;
  if (perMillion === 0) return "$0";
  if (perMillion < 0.1) return `$${perMillion.toFixed(3)}`;
  if (perMillion < 10) return `$${perMillion.toFixed(2)}`;
  if (perMillion < 1000) return `$${perMillion.toFixed(0)}`;
  return `$${(perMillion / 1000).toFixed(1)}k`;
}

export function formatContext(tokens: number | null | undefined): string {
  if (!tokens) return DASH;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
  if (tokens >= 1000) return `${Math.round(tokens / 1000)}K`;
  return String(tokens);
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(score)) return DASH;
  return score.toFixed(1);
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return DASH;
  return `${value > 0 && value < 1 ? (value * 100).toFixed(digits) : value.toFixed(digits)}%`;
}

export function formatTps(value: number | null | undefined): string {
  if (value === null || value === undefined) return DASH;
  return `${Math.round(value)}`;
}

export function formatLatency(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return DASH;
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  return `${seconds.toFixed(1)}s`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return DASH;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return DASH;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return DASH;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return DASH;
  const diff = Date.now() - then;
  const days = Math.floor(diff / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${(days / 365).toFixed(1)}y ago`;
}

export function shortModelName(name: string, authorLabel: string): string {
  const prefix = `${authorLabel}: `;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

export function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}K`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}
