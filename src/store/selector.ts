import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import {
  loadCatalog,
  loadKeys,
  saveKeys,
  type CatalogResponse,
  type Keys,
} from "../lib/api";
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  type Filters,
  type Sort,
} from "../lib/filter";
import {
  makePreset,
  mergeFilters,
  mergeSort,
  mergeWeights,
  type ImportedConfig,
  type Preset,
} from "../lib/presets";
import { DEFAULT_WEIGHTS, type ScoreWeights } from "../lib/scoring";

export type View = "explore" | "compare" | "presets";
export type Density = "compact" | "cozy" | "comfortable";
export type Status = "idle" | "loading" | "ready" | "error";

export interface ColumnConfig {
  modalities: boolean;
  weights: boolean;
  context: boolean;
  input: boolean;
  output: boolean;
  cache: boolean;
  intelligence: boolean;
  coding: boolean;
  speed: boolean;
}

export const DEFAULT_COLUMNS: ColumnConfig = {
  modalities: true,
  weights: true,
  context: true,
  input: true,
  output: true,
  cache: true,
  intelligence: true,
  coding: false,
  speed: true,
};

interface SelectorState {
  catalog: CatalogResponse | null;
  source: "api" | "snapshot" | null;
  status: Status;
  error: string | null;
  refreshing: boolean;

  filters: Filters;
  sort: Sort;
  weights: ScoreWeights;
  view: View;
  density: Density;
  columns: ColumnConfig;
  selected: string[];
  presets: Preset[];
  keys: Keys;
  rememberKeys: boolean;

  hydrate: (options?: { refresh?: boolean }) => Promise<void>;
  setFilters: (patch: Partial<Filters> | ((current: Filters) => Filters)) => void;
  resetFilters: () => void;
  setSort: (key: Sort["key"]) => void;
  setSortDir: (dir: Sort["dir"]) => void;
  setWeights: (weights: ScoreWeights) => void;
  setView: (view: View) => void;
  setDensity: (density: Density) => void;
  setColumns: (columns: Partial<ColumnConfig>) => void;
  toggleSelected: (id: string) => void;
  clearSelected: () => void;
  setSelected: (ids: string[]) => void;
  savePreset: (name: string) => Preset | null;
  applyPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
  importPresets: (presets: Preset[]) => void;
  applyImportedConfig: (config: ImportedConfig) => void;
  setKeys: (keys: Partial<Keys>, remember?: boolean) => void;
}

const MAX_COMPARE = 6;

export const useSelector = create<SelectorState>()(
  persist(
    (set, get) => ({
      catalog: null,
      source: null,
      status: "idle",
      error: null,
      refreshing: false,

      filters: DEFAULT_FILTERS,
      sort: DEFAULT_SORT,
      weights: DEFAULT_WEIGHTS,
      view: "explore",
      density: "cozy",
      columns: DEFAULT_COLUMNS,
      selected: [],
      presets: [],
      keys: loadKeys(),
      rememberKeys: true,

      hydrate: async (options) => {
        const { status, refreshing } = get();
        if (status === "loading" || refreshing) return;
        set({ status: status === "ready" ? "ready" : "loading", error: null, refreshing: true });
        try {
          const { catalog, source } = await loadCatalog({
            keys: get().keys,
            refresh: options?.refresh,
          });
          set({ catalog, source, status: "ready", refreshing: false });
        } catch (error) {
          set({
            status: "error",
            error: (error as Error).message,
            refreshing: false,
          });
        }
      },

      setFilters: (patch) => {
        const current = get().filters;
        const next = typeof patch === "function" ? patch(current) : { ...current, ...patch };
        set({ filters: next });
      },

      resetFilters: () => set({ filters: { ...DEFAULT_FILTERS }, selected: [] }),

      setSort: (key) => {
        const { sort } = get();
        if (sort.key === key) {
          set({ sort: { key, dir: sort.dir === -1 ? 1 : -1 } });
          return;
        }
        const ascending = key === "name" || key === "price" || key === "cacheRead";
        set({ sort: { key, dir: ascending ? 1 : -1 } });
      },

      setSortDir: (dir) => set({ sort: { ...get().sort, dir } }),
      setWeights: (weights) => set({ weights }),
      setView: (view) => set({ view }),
      setDensity: (density) => set({ density }),
      setColumns: (columns) => set({ columns: { ...get().columns, ...columns } }),

      toggleSelected: (id) => {
        const { selected } = get();
        if (selected.includes(id)) {
          set({ selected: selected.filter((item) => item !== id) });
          return;
        }
        const next = [...selected, id];
        set({ selected: next.slice(-MAX_COMPARE) });
      },

      clearSelected: () => set({ selected: [] }),
      setSelected: (ids) => set({ selected: ids.slice(0, MAX_COMPARE) }),

      savePreset: (name) => {
        const { filters, sort, weights, presets } = get();
        const preset = makePreset(name, filters, sort, weights);
        set({ presets: [preset, ...presets] });
        return preset;
      },

      applyPreset: (id) => {
        const preset = get().presets.find((item) => item.id === id);
        if (!preset) return;
        set({
          filters: { ...DEFAULT_FILTERS, ...preset.filters },
          sort: preset.sort,
          weights: preset.weights,
        });
      },

      deletePreset: (id) => set({ presets: get().presets.filter((item) => item.id !== id) }),

      renamePreset: (id, name) =>
        set({
          presets: get().presets.map((item) =>
            item.id === id ? { ...item, name: name.slice(0, 80) } : item,
          ),
        }),

      importPresets: (incoming) => {
        const existing = get().presets;
        const byName = new Map(existing.map((preset) => [preset.name.toLowerCase(), preset]));
        const merged = [...existing];
        for (const preset of incoming) {
          const found = byName.get(preset.name.toLowerCase());
          if (found) {
            const index = merged.findIndex((item) => item.id === found.id);
            merged[index] = { ...preset, id: found.id };
          } else {
            merged.unshift(preset);
          }
        }
        set({ presets: merged });
      },

      applyImportedConfig: (config) => {
        set({
          filters: mergeFilters(config.filters),
          sort: mergeSort(config.sort),
          weights: mergeWeights(config.weights),
          view: config.view ?? get().view,
          selected: (config.selected ?? []).slice(0, MAX_COMPARE),
        });
      },

      setKeys: (keys, remember) => {
        const next = { ...get().keys, ...keys };
        const rememberNext = remember ?? get().rememberKeys;
        saveKeys(next, rememberNext);
        set({ keys: next, rememberKeys: rememberNext });
      },
    }),
    {
      name: "som.selector.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        filters: state.filters,
        sort: state.sort,
        weights: state.weights,
        view: state.view,
        density: state.density,
        columns: state.columns,
        selected: state.selected,
        presets: state.presets,
        rememberKeys: state.rememberKeys,
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<SelectorState>;
        return {
          ...current,
          ...saved,
          filters: mergeFilters(saved.filters),
          sort: mergeSort(saved.sort),
          weights: mergeWeights(saved.weights),
          columns: { ...DEFAULT_COLUMNS, ...(saved.columns ?? {}) },
          keys: loadKeys(),
        };
      },
    },
  ),
);

export { MAX_COMPARE };
