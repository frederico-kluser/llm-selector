#!/usr/bin/env node
/**
 * Build the static catalogue snapshot consumed by the web app.
 *
 *   ARTIFICIAL_ANALYSIS_API_KEY=aa_... node scripts/build-catalog.mjs
 *
 * Writes public/data/catalog.json (committed so the site works on static hosting and
 * so the repo is reproducible without any key).
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildCatalog, fetchOpenRouter } from "../shared/catalog.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outFile = resolve(root, "public/data/catalog.json");

const OR_KEY = process.env.OPENROUTER_API_KEY?.trim() || "";

const t0 = Date.now();

async function main() {
  console.log("→ fetching OpenRouter model catalogue…");
  let orModels;
  try {
    orModels = await fetchOpenRouter({ apiKey: OR_KEY || undefined });
  } catch (error) {
    // A networkless CI or offline dev run must not fail the build: keep the previous
    // snapshot when there is one, otherwise emit an empty catalogue the UI handles.
    const { readFile } = await import("node:fs/promises");
    try {
      const previous = JSON.parse(await readFile(outFile, "utf8"));
      console.warn(`  ! OpenRouter unreachable (${error.message}); keeping the existing snapshot`);
      console.warn(`    ${previous.models?.length ?? 0} models, built ${previous.generatedAt ?? "unknown"}`);
      return;
    } catch {
      console.warn(`  ! OpenRouter unreachable (${error.message}); writing an empty catalogue`);
      await mkdir(dirname(outFile), { recursive: true });
      await writeFile(
        outFile,
        `${JSON.stringify({
          version: 1,
          generatedAt: new Date().toISOString(),
          benchmarks: [],
          models: [],
          creators: [],
          feed: null,
          sources: [],
          bounds: { prompt: [0, 0], cacheRead: [0, 0], context: [0, 0], created: [null, null] },
          stats: {
            models: 0,
            withBenchmarks: 0,
            open: 0,
            closed: 0,
            unknown: 0,
            free: 0,
            withCache: 0,
            deprecated: 0,
            byModality: {},
            aaMatched: 0,
          },
        })}
`,
        "utf8",
      );
      return;
    }
  }
  const openRouterFetchedAt = new Date().toISOString();
  console.log(`  ${orModels.length} models`);

  // Artificial Analysis rows are never baked into the repo: the licence forbids
  // redistributing raw data (see NOTICE.md). They are fetched per user at runtime.
  const catalog = buildCatalog({
    orModels,
    orMeta: { openRouterFetchedAt },
  });

  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, `${JSON.stringify(catalog)}\n`, "utf8");

  const { stats, sources } = catalog;
  console.log("\n✓ catalogue written");
  console.log(`  file        ${outFile.replace(root + "/", "")}`);
  console.log(`  models      ${stats.models}`);
  console.log(`  benchmarked ${stats.withBenchmarks} (OpenRouter-embedded indices only)`);
  console.log(`  open/closed ${stats.open}/${stats.closed} (+${stats.unknown} unknown)`);
  console.log(`  free        ${stats.free}`);
  console.log(`  with cache  ${stats.withCache}`);
  console.log(`  deprecated  ${stats.deprecated}`);
  console.log(
    `  sources     ${sources.map((s) => `${s.label}:${s.count}`).join("  ")}`,
  );
  console.log(`  bytes       ${(Buffer.byteLength(JSON.stringify(catalog)) / 1024).toFixed(0)} kB`);
  console.log(`  took        ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((error) => {
  console.error(`\n✗ build failed: ${error.message}`);
  process.exitCode = 1;
});
