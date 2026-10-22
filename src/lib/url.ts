import { DEFAULT_FILTERS, DEFAULT_SORT, type Filters, type Sort } from "./filter";
import { DEFAULT_WEIGHTS, type ScoreWeights } from "./scoring";

/**
 * The URL is a serialisation of the view, not the source of truth. Keys are short and
 * human-editable, defaults are omitted, and nothing secret ever lands here.
 */
export function encodeState({
  filters,
  sort,
  weights,
  view,
  selected,
}: {
  filters: Filters;
  sort: Sort;
  weights: ScoreWeights;
  view: string;
  selected: string[];
}): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.input.values.length) params.set("m", filters.input.values.join(","));
  if (filters.input.values.length && filters.input.mode !== "all") params.set("mm", filters.input.mode);
  if (filters.output.length) params.set("o", filters.output.join(","));
  if (filters.weights !== "any") params.set("w", filters.weights);
  if (filters.price.freeOnly) params.set("free", "1");
  else if (filters.price.min > 0 || filters.price.max < DEFAULT_FILTERS.price.max) {
    params.set("p", `${filters.price.min}-${filters.price.max}`);
    if (filters.price.axis !== "blended") params.set("pa", filters.price.axis);
  }
  if (!filters.price.includeUnpriced) params.set("up", "0");
  if (filters.cache.require) params.set("c", String(filters.cache.max));
  if (filters.cache.minDiscount) params.set("cd", String(filters.cache.minDiscount));
  if (filters.minContext) params.set("cx", String(filters.minContext));
  if (filters.requireScored) params.set("sc", "1");
  const mins = Object.entries(filters.mins).filter(([, value]) => value > 0);
  if (mins.length) params.set("b", mins.map(([key, value]) => `${key}:${value}`).join(","));
  if (filters.features.length) params.set("f", filters.features.join(","));
  if (filters.creators.length) params.set("a", filters.creators.join(","));
  if (filters.maxAgeDays) params.set("age", String(filters.maxAgeDays));
  if (!filters.hideDeprecated) params.set("hd", "0");
  if (filters.hideAliases) params.set("ha", "1");
  if (filters.hideBatch) params.set("hb", "1");
  if (filters.hideFree) params.set("hf", "1");
  if (sort.key !== DEFAULT_SORT.key || sort.dir !== DEFAULT_SORT.dir) {
    params.set("s", `${sort.key}.${sort.dir === -1 ? "desc" : "asc"}`);
  }
  const weightDiff = JSON.stringify(weights) !== JSON.stringify(DEFAULT_WEIGHTS);
  if (weightDiff) params.set("sw", Object.values(weights).join("."));
  if (view !== "explore") params.set("v", view);
  if (selected.length) params.set("sel", selected.join(","));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export interface UrlState {
  filters: Filters;
  sort: Sort;
  weights: ScoreWeights;
  view: string;
  selected: string[];
}

export function decodeState(search: string): Partial<UrlState> {
  const params = new URLSearchParams(search);
  const filters: Filters = structuredClone(DEFAULT_FILTERS);
  const out: Partial<UrlState> = {};

  const q = params.get("q");
  if (q) filters.q = q;
  const m = params.get("m");
  if (m) filters.input.values = m.split(",") as Filters["input"]["values"];
  const mm = params.get("mm");
  if (mm === "any") filters.input.mode = "any";
  const o = params.get("o");
  if (o) filters.output = o.split(",") as Filters["output"];
  const w = params.get("w");
  if (w === "open" || w === "closed") filters.weights = w;
  if (params.get("free") === "1") filters.price.freeOnly = true;
  const p = params.get("p");
  if (p) {
    const [min, max] = p.split("-").map(Number);
    if (Number.isFinite(min)) filters.price.min = min;
    if (Number.isFinite(max)) filters.price.max = max;
  }
  const pa = params.get("pa");
  if (pa === "prompt" || pa === "completion" || pa === "blended") filters.price.axis = pa;
  if (params.get("up") === "0") filters.price.includeUnpriced = false;
  const c = params.get("c");
  if (c) {
    filters.cache.require = true;
    const value = Number(c);
    if (Number.isFinite(value)) filters.cache.max = value;
  }
  const cd = params.get("cd");
  if (cd) filters.cache.minDiscount = Number(cd) || 0;
  const cx = params.get("cx");
  if (cx) filters.minContext = Number(cx) || 0;
  if (params.get("sc") === "1") filters.requireScored = true;
  const b = params.get("b");
  if (b) {
    for (const entry of b.split(",")) {
      const [key, value] = entry.split(":");
      if (key && value) filters.mins[key as keyof Filters["mins"]] = Number(value);
    }
  }
  const f = params.get("f");
  if (f) filters.features = f.split(",");
  const a = params.get("a");
  if (a) filters.creators = a.split(",");
  const age = params.get("age");
  if (age) filters.maxAgeDays = Number(age) || 0;
  if (params.get("hd") === "0") filters.hideDeprecated = false;
  if (params.get("ha") === "1") filters.hideAliases = true;
  if (params.get("hb") === "1") filters.hideBatch = true;
  if (params.get("hf") === "1") filters.hideFree = true;

  out.filters = filters;

  const s = params.get("s");
  if (s) {
    const [key, dir] = s.split(".");
    out.sort = { key: key as Sort["key"], dir: dir === "asc" ? 1 : -1 };
  }
  const sw = params.get("sw");
  if (sw) {
    const [quality, price, speed, context, cache] = sw.split(".").map(Number);
    if ([quality, price, speed, context, cache].every(Number.isFinite)) {
      out.weights = { quality, price, speed, context, cache };
    }
  }
  const v = params.get("v");
  if (v === "explore" || v === "compare" || v === "presets") out.view = v;
  const sel = params.get("sel");
  if (sel) out.selected = sel.split(",").filter(Boolean);
  return out;
}
