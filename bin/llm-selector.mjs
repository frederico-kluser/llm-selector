#!/usr/bin/env node
/**
 * llm-selector — start the local selector UI.
 *
 * The published tarball ships the built app plus the small API server; the model
 * catalogue is fetched at runtime, so no third-party data is bundled.
 */

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8"));

const HELP = `llm-selector ${pkg.version} — find the model that fits your constraints.

Usage
  npx llm-selector [options]

Options
  -p, --port <number>   Port for the local API and UI   (default: 8899, env PORT)
      --host <address>  Bind address                    (default: 127.0.0.1, env HOST)
      --no-open         Do not open the browser
      --json            Print the resolved URL as JSON and exit
  -h, --help            Show this help
  -v, --version         Show the version

Environment
  ARTIFICIAL_ANALYSIS_API_KEY   unlock benchmark indices, cache pricing and throughput
  OPENROUTER_API_KEY            account credits and live provider stats
  PORT / HOST                   same as --port / --host

The UI opens at http://<host>:<port>. Keys stay in this process: nothing is sent
anywhere except OpenRouter and Artificial Analysis.
`;

function parseArgs(argv) {
  const options = { port: Number(process.env.PORT ?? 8899), host: process.env.HOST ?? "127.0.0.1", open: true, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") return { help: true };
    if (arg === "-v" || arg === "--version") return { version: true };
    if (arg === "--no-open") options.open = false;
    else if (arg === "--open") options.open = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "-p" || arg === "--port") options.port = Number(argv[++i]);
    else if (arg.startsWith("--port=")) options.port = Number(arg.slice(7));
    else if (arg === "--host") options.host = argv[++i];
    else if (arg.startsWith("--host=")) options.host = arg.slice(7);
    else if (arg.startsWith("-")) {
      console.error(`Unknown option: ${arg}\n\n${HELP}`);
      process.exit(2);
    }
  }
  if (!Number.isInteger(options.port) || options.port < 1 || options.port > 65535) {
    console.error(`Invalid port: ${options.port}`);
    process.exit(2);
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  process.stdout.write(HELP);
  process.exit(0);
}
if (options.version) {
  process.stdout.write(`${pkg.version}\n`);
  process.exit(0);
}

process.env.PORT = String(options.port);
process.env.HOST = options.host;

const url = `http://${options.host === "0.0.0.0" ? "127.0.0.1" : options.host}:${options.port}`;

if (options.json) {
  process.stdout.write(`${JSON.stringify({ url, version: pkg.version })}\n`);
}

function openBrowser(target) {
  const command =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", target] : [target];
  try {
    const child = spawn(command, args, { stdio: "ignore", detached: true });
    child.unref();
  } catch {
    // Opening a browser is a convenience, never a failure mode.
  }
}

await import("../server/index.mjs");

if (options.open && !options.json) {
  setTimeout(() => openBrowser(url), 700);
}
