import type { BenchmarkKey, Modality, Openness, OutputModality, Variant } from "./types";

export const BENCHMARK_LABELS: Partial<Record<BenchmarkKey, string>> = {
  intelligence: "Intelligence ≥",
  coding: "Coding ≥",
  agentic: "Agentic ≥",
  finance: "Finance ≥",
  strategy: "Strategy ≥",
  legal: "Legal ≥",
  healthcare: "Healthcare ≥",
  engineering: "Engineering ≥",
  economics: "Economics ≥",
  terminalbench: "Terminal-Bench ≥",
  livecodebench: "LiveCodeBench ≥",
  scicode: "SciCode ≥",
  gpqa: "GPQA Diamond ≥",
  mmluPro: "MMLU-Pro ≥",
  hle: "HLE ≥",
  aime: "AIME ≥",
  math500: "MATH-500 ≥",
  ifbench: "IFBench ≥",
  lcr: "Long-context ≥",
  tau2: "τ²-Bench ≥",
  tauBanking: "τ-Banking ≥",
  math: "Math ≥",
};

export const MODALITY_LABELS: Record<Modality, string> = {
  text: "Text",
  image: "Image",
  audio: "Audio",
  video: "Video",
  file: "File",
};

export const MODALITY_GLYPH: Record<Modality, string> = {
  text: "T",
  image: "I",
  audio: "A",
  video: "V",
  file: "F",
};

export const OUTPUT_LABELS: Record<OutputModality, string> = {
  text: "Text",
  image: "Image",
  audio: "Audio",
  embeddings: "Embeddings",
};

export const OPENNESS_LABELS: Record<Openness, string> = {
  open: "Open",
  closed: "Proprietary",
  unknown: "Unknown",
};

export const OPENNESS_HINTS: Record<Openness, string> = {
  open: "Weights are published",
  closed: "Hosted-only model; weights are not published",
  unknown: "No reliable signal either way",
};

export const VARIANT_LABELS: Record<Variant, string> = {
  standard: "",
  free: "free",
  batch: "batch",
  alias: "alias",
  router: "router",
};

export const FEATURE_LABELS: Record<string, string> = {
  tools: "Tools",
  structured: "Structured output",
  reasoning: "Reasoning",
  web_search: "Web search",
  prompt_cache: "Prompt cache",
  image_output: "Image output",
  audio_output: "Audio output",
  long_context: "200K+ context",
  logprobs: "Logprobs",
};

export const SOURCE_LABELS: Record<string, string> = {
  "artificial-analysis": "Artificial Analysis",
  openrouter: "OpenRouter",
};
