# Vercel deployment dossier — Vite SPA + Node functions, from the terminal only

**Project:** `llm-selector` — Vite 8 / React 19 SPA (builds to `dist/`) + Node 24 Express 5 server
(`server/index.mjs`) exposing `/api/catalog`, `/api/providers/:author/:slug`, `/api/account`,
`/api/health`, `/api/snapshot`.
**Question:** deploy to Vercel from the terminal with no dashboard clicking, keeping the SPA static
and the API as Node functions.
**Verification date:** 2026-10-22. Every Vercel claim below is checked against the current docs,
which were fetched in their machine-readable form (`https://vercel.com/docs/<path>.md`, YAML
front-matter carries `last_updated`) plus the Vercel CLI source on GitHub and the npm registry.
**CLI version verified:** `vercel@65.1.0` (npm `latest` dist-tag, 2026-10-22) — matches the "65.x"
premise. Node on Vercel: **24.x is the default** ([S26]).

> Tooling note (transparency): the mandated Tavily deep-research kickoff ran and created its dossier,
> but the key pool on this machine was fully banned (`tavily.py status`: all keys `REVOKED` /
> `QUOTA_EXHAUSTED`, exit ≠ 0 on every search), so per the fallback instruction all evidence below
> comes from direct retrieval of Vercel's own `.md` documentation, the Vercel CLI source and the npm
> registry. Primary sources beat search snippets for this topic anyway.

---

## 0. TL;DR — recommended architecture

**Framework Preset "Vite" (auto-detected) + `api/*.mjs` ESM functions + a 4-key `vercel.json`.**
Confidence: **high**.

| Layer | Choice | Why |
| --- | --- | --- |
| Static SPA | Framework Preset **Vite** (auto-detected from the `vite` dependency) | Preset already sets Build Command `vite build` and Output Directory `dist` ([S24]); Vercel prefers the `build` script in `package.json` when present ([S27]), which is exactly what this repo needs (`build-catalog` → `tsc -b --noEmit` → `vite build`). **No `buildCommand`/`outputDirectory` needed.** |
| API | Root `api/*.mjs`, one file per route group, ESM `export default function handler(req, res)` | Native Node runtime; `.mjs` (or `"type":"module"` in the nearest `package.json`) is required for native ESM in JS handlers ([S3]). This repo already has `"type": "module"`. |
| Routing | `rewrites` with a negative lookahead that **excludes `/api/`** | Filesystem (static files **and** functions) is resolved *before* rewrites ([S1], [S20]), so a plain `/(.*)` catch-all would still let `/api/*` through — but a *typo'd/deleted* API path would then return `index.html` with `200`, which is a debugging trap. Excluding `/api/` keeps 404s honest. |
| Limits | `functions: { "api/**/*.mjs": { "maxDuration": 60 } }` | Upstream fetches (AA, OpenRouter) are I/O-bound; 60 s is ample and far below every plan's cap (Hobby 300 s). Can also be set in-file via `export const config = { maxDuration }` ([S6]). |
| Env | `ARTIFICIAL_ANALYSIS_API_KEY` (Secret, Production+Preview), optional `OPENROUTER_API_KEY` | Server-side only; keys never reach the browser ([S14]). |
| Caching | `private, max-age=…` for keyed responses; `s-maxage`+`stale-while-revalidate` only for responses that do **not** vary by user key; `getCache()` (Runtime Cache) for the AA rate-limited feed | [S9], [S10] |

**Why not the "everything explicit" variant** (`"framework": null` + `buildCommand` + `outputDirectory`)?
It works and is fully documented ([S1]: `buildCommand`, `outputDirectory`, `framework` are all valid
`vercel.json` keys), but it duplicates what the preset already derives and drifts when the preset
changes. Keep it as the escape hatch: if preset detection ever misbehaves on a machine, adding those
two keys (and `"framework": null`) reproduces the same build deterministically.

---

## 1. `vercel.json` — the exact config

### 1.1 Recommended file (valid JSON, no comments)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/:path((?!api/|assets/|data/).*)", "destination": "/index.html" }
  ],
  "functions": {
    "api/**/*.mjs": { "maxDuration": 60 }
  },
  "headers": [
    {
      "source": "/api/health",
      "headers": [{ "key": "Cache-Control", "value": "no-store" }]
    },
    {
      "source": "/data/catalog.json",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
        }
      ]
    }
  ]
}
```

Notes on each key:

* `$schema` — enables editor validation; Vercel's own docs put it at the top of every example ([S1]).
* `rewrites` — the SPA fallback. Vercel's documented SPA form is `{"source":"/(.*)","destination":"/index.html"}`
  ([S1], [S2]); the `/:path((?!…).*)` form is the same mechanism with a negative lookahead, a syntax
  Vercel ships in its own examples (`/:path((?!uk/).*)`, [S1], [S20]). If you ever want the maximally
  conservative form, use `{"source":"/(.*)","destination":"/index.html"}` — it is safe for `/api/*`
  because **"precedence is given to the filesystem prior to rewrites being applied"** ([S1]) and
  `rewrites` "checks the filesystem by default" ([S1]).
* `functions` — glob keys; values accept `runtime`, `maxDuration`, `includeFiles`, `excludeFiles`,
  `regions`, `functionFailoverRegions`, `supportsCancellation`. **`memory` cannot be set here while
  Fluid compute is on** — set it in the dashboard's Functions section instead ([S1], [S7]).
  `maxDuration` accepts an integer or the literal `"max"` (resolves to the plan max, but not to the
  1800 s beta) ([S1]).
* `headers` — static values only; cannot validate an origin at runtime ([S21]).

### 1.2 What belongs in `vercel.json` (and what does not)

| Key | Belongs? | Evidence |
| --- | --- | --- |
| `$schema` | Yes (typing only) | [S1] |
| `buildCommand` | **Optional** — only to override the `build` script / preset default | [S1], [S27] |
| `outputDirectory` | **Optional** — the Vite preset already yields `dist` | [S1], [S24] |
| `framework` | Optional; `"vite"` or `null` ("Other") | [S1] |
| `rewrites` | **Yes** — SPA fallback | [S1], [S2] |
| `functions.maxDuration` | **Yes** — per-function/per-glob limit | [S1] |
| `functions.memory` | **No** with Fluid compute → dashboard | [S1], [S7] |
| `headers` | Yes, for static asset caching / `no-store` on health | [S1], [S9] |
| `regions` | Optional (single region `iad1` by default) | [S1], [S5] |
| `builds` (legacy) | **No** — cannot be combined with `functions`; deprecated | [S1] |
| `cleanUrls` | Leave unset (if `true`, drop `.html` from rewrite paths) | [S1], [S2] |
| `installCommand` | Not needed: `pnpm-lock.yaml` ⇒ `pnpm install` | [S3] |
| `env` / `build.env` | **No** — legacy; use `vercel env` | [S1] |

### 1.3 The modern alternative, stated exactly

Framework Preset **Vite** + root `api/*.mjs` files, each with a default export. Vercel builds the SPA
into `dist/` and turns each supported file in `api/` into its own function ([S3], [S22] quickstart);
`(a)` build, `(b)` static serving and `(c)` `/api/*` routing all happen with **no** `vercel.json` at
all. Only `(d)` — SPA deep links — actually requires config, and Vercel documents precisely this file
for it ([S2]).

**Recommendation:** ship the 1.1 file. It is 20 lines, contains only things the preset cannot infer,
and makes the SPA/API boundary explicit.

---

## 2. The exact shape of a Node function in `api/`

### 2.1 Signature (Node runtime, req/res)

```js
// api/health.mjs
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    hasEnvAaKey: Boolean(process.env.ARTIFICIAL_ANALYSIS_API_KEY),
    region: process.env.VERCEL_REGION ?? null,
  });
}

export const config = { maxDuration: 30 }; // per-function override (optional)
```

* **ESM vs CJS:** handlers must "export a default function" ([S3]); to use native ESM in JavaScript
  handlers use **`.mjs`** or set `"type": "module"` in the nearest `package.json` — otherwise Vercel
  **compiles ESM syntax in `.js` files to CJS** ([S3]). This repo has `"type": "module"` at the root,
  so `.js` would also work; `.mjs` is unambiguous.
* **CommonJS form** (`module.exports = (req,res) => {}`) is still supported ([S3] examples).
* **Web-standard alternative:** `export default { fetch(request) { return Response.json({…}); } }`
  or per-method `export function GET(request)` — both documented and Vercel-recommended for routing
  several paths from one function ([S3], [S4]). Mixing styles across files is fine.
* `export const config = { maxDuration }` is explicitly the Node `/api` route mechanism ([S6]).
* Whole project can be pinned with `engines.node` in `package.json`; Vercel honours it over the
  dashboard setting (`>=22.0.0` ⇒ latest 24.x) ([S26]).

### 2.2 `req.query` / `req.body` / response helpers

Provided by `@vercel/node` on the plain Node `IncomingMessage`/`ServerResponse` ([S3]):

| Helper | Behaviour |
| --- | --- |
| `req.query` | parsed query string object, `{}` when absent |
| `req.cookies` | parsed cookies, `{}` when absent |
| `req.body` | getter, **lazy**; `undefined` without/with unsupported `Content-Type`; JSON ⇒ object, `x-www-form-urlencoded` ⇒ object, `text/plain` ⇒ string, `application/octet-stream` ⇒ `Buffer` |
| `res.status(code)` | chainable |
| `res.send(body)` | string / object / Buffer |
| `res.json(obj)` | JSON response |
| `res.redirect(url)` | 307 by default |

Gotcha: **malformed JSON makes `req.body` throw** — wrap the access in `try/catch` and return 400
([S3]). Helpers can be disabled with `NODEJS_HELPERS=0` ([S3]).

### 2.3 Streaming

* Streaming is **enabled by default for all Node.js functions** since 2024-10-01; `VERCEL_FORCE_NODEJS_STREAMING`
  is no longer required ([S29], [S8]).
* With `req`/`res`: `res.writeHead(200, {...})`, then `res.write(chunk)` repeatedly, `res.end()`
  ([S3] cancellation example uses exactly this).
* The function's `maxDuration` **includes** streamed responses; Edge runtime must start responding
  within 25 s and can stream up to 300 s ([S5]).
* Streaming changes runtime-log shape/frequency — relevant if Log Drains are added later ([S29]).

### 2.4 Size and duration ceilings

| Limit | Value | Source |
| --- | --- | --- |
| Request body **and** response body | **4.5 MB** (else `413 FUNCTION_PAYLOAD_TOO_LARGE`) | [S5] |
| Uncompressed function size | 250 MB (500 MB Python; 5 GB "large functions" beta) | [S5] |
| `maxDuration`, Hobby | default **300 s**, maximum **300 s** | [S5], [S6], [S28] |
| `maxDuration`, Pro / Enterprise | default **300 s**, max **800 s**, extended **1800 s** (beta, function-level only) | [S5], [S6], [S28] |
| Concurrency | auto-scales to 30 000 (Hobby/Pro), 100 000+ (Enterprise) | [S5] |
| Edge runtime | first byte ≤ 25 s; streaming ≤ 300 s | [S5] |

Our `/api/catalog` payload is ~855 KB today — inside the 4.5 MB cap but worth compressing and watching
if benchmark data grows.

### 2.5 `node:fs` and bundling of local modules

* **`node:fs` works** — the Node runtime supports all Node APIs ([S3]). The filesystem contains the
  traced bundle and is not a writable data store.
* **Imports are traced and bundled**, including files outside `api/`. The KB's canonical example
  imports `../greet.cjs` from `api/file.js` and only needs extra config for **non-traceable** files
  ([S22]).
* **Files read at runtime need `includeFiles`** when the path is computed (nft cannot see it):

  ```json
  { "functions": { "api/snapshot.mjs": { "includeFiles": "public/data/catalog.json" } } }
  ```

  ([S22], [S1]; `excludeFiles` is the inverse; both are unsupported in Next.js, which uses
  `outputFileTracingIncludes` instead).
* **Keep shared code outside `api/`.** Vercel's own instruction: "Avoid placing shared utilities and
  route modules in the root `api/` directory … Keep shared code outside `api/` and import it from your
  function entry point" ([S4], [S3]). Every supported file in `api/` becomes its own function;
  `_foo.mjs`, `.foo`, `*.d.ts` are exempt ([S4]). So `shared/aa.mjs`, `shared/catalog.mjs`,
  `shared/normalize.mjs`, `shared/benchmarks.mjs` are imported relatively (`../shared/catalog.mjs`)
  and get bundled — no config needed.
* **`node_modules` is not needed for handlers**: `express` must **not** be imported by any `api/`
  function (it would be traced and inflate the bundle, and the Express app in `server/index.mjs` is
  for the local `npx llm-selector` binary only).

### 2.6 Route mapping for this repo

| Current Express route | Vercel file | Notes |
| --- | --- | --- |
| `GET /api/health` | `api/health.mjs` | no auth, `Cache-Control: no-store` |
| `GET /api/catalog` | `api/catalog.mjs` | reads `x-aa-key` header or env; never CDN-cacheable when keyed |
| `GET /api/providers/:author/:slug` | **`api/providers.mjs` reading the pathname** (recommended) | Fewest functions ⇒ best instance reuse ([S4]). If you prefer a bracket file, `api/providers/[author]/[slug].mjs` does **not** route by itself outside Next.js — it needs an explicit rewrite, and params arrive in `req.query` ([S1] Gatsby dynamic-API example) — see 2.7 |
| `GET /api/account` | `api/account.mjs` | reads `x-or-key`; `private, no-store` |
| `GET /api/snapshot` | `api/snapshot.mjs` **or drop it** | Better: serve `dist/data/catalog.json` directly (static, CDN-cached). Only keep the function if you need a stable JSON contract/headers; then use `includeFiles` or `fetch` your own origin |

### 2.7 Bracket (dynamic) routes in `api/` need an explicit rewrite

Outside Next.js a file named `api/providers/[author]/[slug].mjs` is **not** auto-routed to
`/api/providers/:author/:slug`. Vercel's documented pattern is a rewrite that maps the concrete path
onto the bracketed file, with parameters read from `req.query` ([S1]):

```json
{
  "rewrites": [
    { "source": "/api/providers/:author/:slug", "destination": "/api/providers/[author]/[slug]" }
  ]
}
```

Two consequences for this repo:

1. A single `api/providers.mjs` that parses `/api/providers/<author>/<slug>` from the pathname needs no
   rewrite at all and costs one function instead of one per path — preferred.
2. When you add API rewrites, put them **before** the SPA catch-all and keep the catch-all's `/api/`
   exclusion, otherwise the ordering is easy to get wrong.

---

## 3. Cold starts, outbound `fetch`, and caching (the rate-limited-API question)

### 3.1 Cold start behaviour

* Fluid compute is **on by default for all projects created after 2025-04-23** ([S7]) and reduces cold
  starts with bytecode caching (Node 20+) and pre-warming on production deployments ([S7]).
  Bytecode caching applies to **production only** ([S7]).
* Multiple invocations can share one instance ("optimized concurrency"), so a warm instance can serve
  concurrent requests — and its **global state** ([S7]).
* Regions: single region `iad1` by default ([S5]); the upstreams (OpenRouter, Artificial Analysis) are
  US-hosted, so `iad1` is the right default.

### 3.2 Outbound `fetch`

* `fetch` is available (Node 24 runtime) and is **not** subject to CORS — CORS is a browser policy.
  This is precisely why the AA proxy exists: "AA has no CORS grant" is a *browser* problem, not a
  function problem.
* Always pass `AbortSignal.timeout(…)` (the Express server already does: 15–20 s) and set
  `maxDuration` above the worst-case sum.
* Set attribution headers exactly as the server does today (`HTTP-Referer`, `X-OpenRouter-Title`);
  OpenRouter requires them for free-tier rate limits.

### 3.3 Do module-level in-memory caches persist?

**Opportunistically, never authoritatively.** Fluid compute explicitly "lets multiple invocations
share the same physical instance and its global state. Functions can reuse resources across
invocations, such as **in-memory caches** and established database connections" ([S7]) — but Vercel
also warns to "store durable state … instead of relying on in-memory variables", using Redis for
shared state ([S7], WebSockets section), and in-memory caches are described as ephemeral, disappearing
when the instance is shut down ([S7 `use cache` note]). Practical consequences:

* A module-scoped `Map` (today's `cache` object in `server/index.mjs`) survives across requests **on
  the same instance only** — different instances, regions, or a new deployment start empty.
* It is therefore fine as a *hot-path* optimisation and useless as a quota guard. The AA free tier is
  100 req/24 h: a per-instance cache can burn the quota N times over under fan-out.

### 3.4 Recommended caching, in order of preference

1. **CDN cache via `Cache-Control` on the function response** — the only directives Vercel's CDN
   honours for function responses are `s-maxage=N`, `s-maxage=N, stale-while-revalidate=Z`,
   `s-maxage=N, stale-while-revalidate=Z, stale-if-error=Z` ([S9]). `s-maxage` is stripped from the
   client response unless you also send `CDN-Cache-Control` / `Vercel-CDN-Cache-Control`; check
   `x-vercel-cache` for `HIT`/`MISS` ([S9]).
   *Safe pattern:* `public, s-maxage=300, stale-while-revalidate=3600` **only** when the response does
     not depend on a caller-supplied secret. Our `/api/catalog` varies on `x-aa-key` → **must** be
     `private` (or the key must be server-side env only). CDN caching keys do not include custom
     request headers unless you set `Vary`, and `Vary: Cookie`/high-cardinality headers are not
     cacheable ([S9]).
2. **Runtime Cache** (`getCache()` from `@vercel/functions`) — the right tool for "cache the upstream
   payload across instances": regional, persistent across deployments, environment-isolated, TTL +
   tags, available on **all plans**, 2 MB max per item, ≤128 tags ([S10], [S30]).
3. **ISR** — Next.js/framework feature; **not applicable** to a static Vite SPA ([S9]).
4. **External KV/Redis** — only if you need cross-region, durable, or >2 MB state ([S7]).

### 3.5 Pattern for a rate-limited third-party API (Artificial Analysis, 100 req/24 h)

1. **Server-side credential only.** `ARTIFICIAL_ANALYSIS_API_KEY` as a Vercel Secret; the browser never
   sends a key on the public deployment. A client-supplied `x-aa-key` path should stay opt-in (and must
   never be CDN-cached).
2. **Single-flight + floor interval** at module scope: one in-flight promise per key, and refuse to
   refetch within `AA_MIN_INTERVAL_MS` even on `refresh=1` (the Express server already enforces 60 s).
3. **Runtime Cache** with a TTL ≥ the quota window (`ttl: 21600` = 6 h, matching today's `AA_TTL_MS`),
   keyed by a hash of the key: `await cache.set(key, feed, { ttl, tags: ["aa"] })` ([S10]).
4. **Serve stale on failure**: on 429/5xx return the last good payload with
   `Cache-Control: private, max-age=60, stale-if-error=600`, and surface `aaError` in the body (already
   done) instead of failing the request.
5. **Propagate the upstream status honestly** on cold miss: `429` + `Retry-After`, not `502`.
6. **Never cache the keyed response publicly**; `Vary: x-aa-key` is not a substitute (high-cardinality
   headers are not cacheable, [S9]).
7. Keep `maxDuration` ≥ (AA timeout + OpenRouter timeout + build time) — 60 s is comfortable.
8. Optional: a Vercel Cron to warm the cache off-peak (`crons` key in `vercel.json`, [S1]) — do not
   spend the AA quota on user traffic.

---

## 4. `vercel deploy --temporary` and `VERCEL_TOKEN` deploys

### 4.1 What `--temporary` actually does (unauthenticated machine)

Verified against the CLI source, not just the docs:

* With no credentials, the CLI otherwise aborts: *"No existing credentials found. Run `vercel deploy
  --temporary` to create a temporary deployment you can claim later, or `vercel login` to log in."*
  ([S23] `commands/deploy/index.ts`).
* `--temporary` sets `isAnonymous = !authConfig.token && flag`; the CLI then calls
  `POST /v1/anonymous/projects?surface=cli`, which returns `{ projectId, token, claimUrl, expiresAt }`,
  persists it in **`.vercel/anonymous.json` (mode 0600)** and adds it to `.gitignore` ([S23]
  `util/deploy/anonymous.ts`).
* **Anonymous deploys always target production** — `--target` other than `production` is rejected
  ([S23] `validateAnonymousTarget`).
* **Refused in CI** (`ciInfo.isCI` ⇒ `'refused'`) and **refused when the directory is already linked**
  to a real project ([S23]).
* The build runs **locally** and is uploaded prebuilt (`const prebuilt = isAnonymous || …`, [S23]).
* On success the CLI prints, on **stderr**, *"This deployment expires in &lt;human duration&gt;. Claim it to
  keep it live (don't share this link): &lt;claimUrl&gt;"*, and stdout stays the deployment URL ([S11],
  [S23]).
* Claiming: the user opens the `claimUrl` (`https://vercel.com/claim-deployment?code=…&returnUrl=…`,
  [S19]) and selects a team; the project then belongs to them. Claim codes generated via the transfer
  API are **valid for 24 hours** ([S19]) — that is the transfer *code*, not proof of the deployment
  TTL.
* **Lifetime:** the exact anonymous-deployment TTL is **UNKNOWN** — it is a server-side `expiresAt`
  that the CLI only formats and prints ([S23]). Do not hardcode "24 hours".
* **Limitations:** no env-var management for an anonymous project (there is no authenticated project
  to attach them to), no custom domain, no `--target` other than production, CI refuses it. Logs and
  function support for anonymous projects are **UNKNOWN** in the docs.
* **Practical verdict for this repo:** `--temporary` is a *static-preview* escape hatch. Functions may
  build, but they would run without `ARTIFICIAL_ANALYSIS_API_KEY`, so benchmarks degrade to
  "client-supplied `x-aa-key` only". For a real deployment use a token.

### 4.2 Token (non-interactive) deploys

* Authenticate with `--token/-t` **or** `VERCEL_TOKEN`; `--token` wins if both are set; `VERCEL_TOKEN`
  is recommended for CI because it does not appear in process lists ([S12]).
* Scope selection: `--scope/-S <team-slug>`, `--team/-T` also exists ([S12]).
* Skip linking entirely with `VERCEL_ORG_ID` **and** `VERCEL_PROJECT_ID` — documented for
  "CI/CD pipelines or non-interactive environments … to skip project linking" ([S12]). Precedence for
  project selection: `--project` > `VERCEL_PROJECT_ID` > `.vercel/project.json` ([S12]).
* `vercel link --yes` is the documented non-interactive linking flag ([S17], [S18]);
  `vercel link --yes --project <name> --scope <team>` is the combination to use here.
* Token scopes: **Full Account**, **Team** or **Project** ([S15]). A project-scoped token can deploy
  that project only; `vercel env add` needs write access to the project, so Project scope suffices.
  Minting new tokens from the CLI (`vercel tokens create`) requires a **classic account-level** token —
  OAuth sessions and team/project-only `vcp_…` tokens are rejected ([S16]).
* `--prod` creates a production deployment; the **first** deployment of a new project is production
  even without `--prod` ([S11]).
* Other flags confirmed in the reference: `--prebuilt`, `--build-env/-b`, `--env/-e`, `--yes`,
  `--cwd`, `--local-config/-A`, `--archive=tgz`, `--skip-domain` (prod only), `--logs/--no-logs`,
  `--dry` ([S11]).

---

## 5. Environment variables via CLI

* Non-interactive add, three equivalent shapes (docs show all three) ([S13]):

  ```bash
  vercel env add NAME production --value "s3cret" --sensitive --yes
  printf '%s' "$VALUE" | vercel env add NAME production
  vercel env add NAME production < ./value.txt
  ```

  The `echo`/pipe form is documented but explicitly warned about (value lands in bash history) ([S13]);
  `--value` has the same exposure via argv. **Prefer stdin from a file or a `printf` of an
  already-exported variable.**
* Flags: `--sensitive` / `--no-sensitive` map to Secret/Config; `--type config|secret`; `--force`
  overwrites without prompting; `--visibility` is a deprecated alias ([S13]).
* Defaults per environment: Production → **secret**, Preview → **secret**, Development → **config**
  ([S13]). Some teams require 2FA/SAML to create scoped tokens ([S15]).
* Environments ([S14]): **Production** applies to the next production deployment (`vercel --prod` or a
  push to the production branch); **Preview** applies to any non-production branch, optionally pinned
  to one branch (branch-specific values override, so you only add overrides); **Development** feeds
  `vercel env pull` (`.env.local`); custom environments exist too.
* **Changes only apply to new deployments** ([S14]) — always redeploy after `vercel env add`.
* `vercel env pull [file]` merges into an existing file, keeps local-only keys, never preserves
  `VERCEL_OIDC_TOKEN`, and writes placeholders for Secret values it cannot read ([S13]).
* Deploy-time-only variables: `--build-env KEY=value` (build step) and `--env KEY=value` (runtime),
  both per-deployment, **not** persisted to the project ([S11]). Useful for a one-off smoke deploy;
  not a substitute for `vercel env add`.
* `vercel env run -- <cmd>` runs a local command with the project's env fetched live ([S13]).

---

## 6. Gotchas

1. **CORS:** functions are not CORS-restricted; **browsers** are. So (a) never try to call Artificial
   Analysis from the SPA, and (b) if you ever enable CORS on our own `/api/*`, use an exact origin plus
   `Vary: Origin`, never `*` with credentials — `vercel.json` values are static, so per-origin
   allowlists need Routing Middleware ([S21]). Vercel's conformance rule `NO_CORS_HEADERS` flags
   CORS-looking config for review ([S21] area).
2. **Reading custom request headers:** Node lowercases them — `req.headers["x-aa-key"]` (not
   `X-AA-Key`); a repeated header can arrive as an array, so normalise with
   `Array.isArray(v) ? v[0] : v`. `x-vercel-*` names are reserved; keep the `x-aa-key` / `x-or-key`
   names used today. **Never** forward the caller's key upstream as an auth header for a different
   service, never log it, never echo it (the Express server already hashes it, [S3] examples show the
   pattern).
3. **CDN cache vs secret headers:** `s-maxage` on a response that varies by `x-aa-key` leaks one user's
   data to another. Use `private, max-age=…`, or terminate the key server-side (env only) and then
   `public, s-maxage=…` ([S9]).
4. **Setting response headers:** `res.setHeader("Cache-Control", …)` before the body, or
   `res.set({...})`; a function's `Cache-Control` **overrides** the same route's header in
   `vercel.json` ([S9]).
5. **SPA fallback masks missing APIs:** with a bare `/(.*)` rewrite, `/api/catalg` returns
   `index.html` + `200`, so the SPA sees "JSON parse error" instead of a 404. Exclude `/api/` (see 1.1)
   and have the client check `content-type`.
6. **Deployment Protection blocks preview APIs:** preview deployments are behind Vercel
   Authentication by default, so `fetch("/api/…")` from a browser against a preview URL returns the
   login page — use `vercel curl` (documented as the way to verify "including when Deployment
   Protection is enabled", [S11]) or a protection-bypass token. Same trap for CORS preflight ([S21]).
7. **`functions` vs `builds`** cannot be combined; `memory` cannot be set in `vercel.json` with Fluid
   compute ([S1], [S7]).
8. **`.vercelignore`:** `dist/` and `public/data/catalog.json` are gitignored in this repo but the CLI
   uploads from disk (it honours `.vercelignore` + a default ignore list, [S11]). Excluding `dist/`,
   `research/`, `pesquisas/`, `tests/` from upload keeps the deploy small; the build regenerates
   `dist/` and the catalog on Vercel.
9. **Build network access matters:** `scripts/build-catalog.mjs` fetches OpenRouter at build time and
   gracefully keeps/creates an empty snapshot when unreachable ([repo source]); on Vercel the build has
   network, and `OPENROUTER_API_KEY` is optional. If you want benchmarks baked into the static
   snapshot, add `ARTIFICIAL_ANALYSIS_API_KEY` as a **build** environment variable too (a Secret is
   available at build time, [S14]).
10. **4.5 MB body/response cap** applies to our `/api/catalog` payload (~855 KB today) ([S5]).
11. **Fluid compute & global state:** do not assume the module `Map` is shared; treat it as a
    per-instance accelerator ([S7], §3.3).
12. **Streaming changes logs** and `maxDuration` includes streaming time ([S29], [S5]).

---

## 7. Sources

| ID | Source | Type | `last_updated` |
| --- | --- | --- | --- |
| S1 | [Static Configuration with vercel.json](https://vercel.com/docs/project-configuration/vercel-json) | Primary reference | 2026-08-14 |
| S2 | [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite) | Primary conceptual | 2026-08-26 |
| S3 | [Using the Node.js Runtime with Vercel Functions](https://vercel.com/docs/functions/runtimes/node-js) | Primary reference | 2026-08-11 |
| S4 | [Advanced Configuration (utility files, bundling)](https://vercel.com/docs/functions/configuring-functions/advanced-configuration) | Primary conceptual | 2026-09-16 |
| S5 | [Vercel Functions Limits](https://vercel.com/docs/functions/limitations) | Primary reference | 2026-08-24 |
| S6 | [Configuring Maximum Duration](https://vercel.com/docs/functions/configuring-functions/duration) | Primary how-to | 2026-08-24 |
| S7 | [Fluid compute](https://vercel.com/docs/fluid-compute) | Primary conceptual | 2026-08-24 |
| S8 | [Streaming](https://vercel.com/docs/functions/streaming-functions) | Primary how-to | 2026-09-01 |
| S9 | [Vercel CDN Cache](https://vercel.com/docs/caching/cdn-cache) | Primary reference | 2026-09-14 |
| S10 | [Runtime Cache](https://vercel.com/docs/caching/runtime-cache) | Primary reference | 2026-08-28 |
| S11 | [vercel deploy](https://vercel.com/docs/cli/deploy) | Primary CLI reference | 2026-09-18 |
| S12 | [Vercel CLI Global Options](https://vercel.com/docs/cli/global-options) | Primary CLI reference | 2026-05-28 |
| S13 | [vercel env](https://vercel.com/docs/cli/env) | Primary CLI reference | 2026-08-20 |
| S14 | [Environment variables](https://vercel.com/docs/environment-variables) | Primary reference | 2026-09-17 |
| S15 | [Access tokens](https://vercel.com/docs/accounts/access-tokens) | Primary reference | 2026-09-08 |
| S16 | [vercel tokens](https://vercel.com/docs/cli/tokens) | Primary CLI reference | 2026-07-15 |
| S17 | [Deploying a project from the CLI](https://vercel.com/docs/projects/deploy-from-cli) | Primary how-to | 2026-09-11 |
| S18 | [Linking Projects with Vercel CLI](https://vercel.com/docs/cli/project-linking) | Primary CLI reference | 2026-08-11 |
| S19 | [Claim Deployments](https://vercel.com/docs/deployments/claim-deployments) | Primary conceptual | 2026-08-21 |
| S20 | [Rewrites on Vercel](https://vercel.com/docs/routing/rewrites) | Primary conceptual | 2026-08-11 |
| S21 | [How to enable CORS on Vercel](https://vercel.com/kb/guide/how-to-enable-cors) | Primary KB guide | 2026-09-28 |
| S22 | [How can I use files in Vercel Functions?](https://vercel.com/kb/guide/how-can-i-use-files-in-serverless-functions) | Primary KB guide | 2026-09-28 |
| S23 | Vercel CLI source — [`commands/deploy/index.ts`](https://github.com/vercel/vercel/blob/main/packages/cli/src/commands/deploy/index.ts), [`commands/deploy/anonymous.ts`](https://github.com/vercel/vercel/blob/main/packages/cli/src/commands/deploy/anonymous.ts), [`util/deploy/anonymous.ts`](https://github.com/vercel/vercel/blob/main/packages/cli/src/util/deploy/anonymous.ts) | Code (main, 2026-10-22) | — |
| S24 | Vercel CLI framework presets — [`packages/frameworks/src/frameworks.ts`](https://github.com/vercel/vercel/blob/main/packages/frameworks/src/frameworks.ts) (`vite` ⇒ `vite build`, `dist`) | Code | — |
| S25 | [`vercel@65.1.0` on npm](https://registry.npmjs.org/vercel) | Registry (`latest`, node ≥20) | 2026-10-22 |
| S26 | [Supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions) | Primary reference | — |
| S27 | [Configure a Build](https://vercel.com/docs/builds/configure-a-build) | Primary reference | — |
| S28 | [Changelog: higher defaults/limits for Fluid compute](https://vercel.com/changelog/higher-defaults-and-limits-for-vercel-functions-running-fluid-compute) | Changelog | 2025-06-25 |
| S29 | [Changelog: streaming by default for Node.js functions](https://vercel.com/changelog/streaming-now-enabled-by-default-for-all-node-js-vercel-functions) | Changelog | 2024-10-01 |
| S30 | [Functions API reference — `getCache`](https://vercel.com/docs/functions/functions-api-reference/vercel-functions-package#getcache) | Primary reference | — |

---

## 8. Confidence and unknowns

| Claim | Confidence | Basis |
| --- | --- | --- |
| Vite preset ⇒ `vite build` + `dist`, so `buildCommand`/`outputDirectory` are optional | **High** | Preset definition in CLI source [S24] + build-script precedence [S27] |
| Filesystem (incl. `api/` functions) resolves before `rewrites` | **High** | Explicit doc statements [S1] ("precedence is given to the filesystem prior to rewrites"), [S20] |
| `api/*.mjs` + `"type":"module"` gives native ESM handlers | **High** | [S3] |
| `export const config = { maxDuration }` works in plain `api/` routes | **High** | [S6] ("Node.js /api routes use an exported config object") |
| 4.5 MB body **and** response cap; 250 MB bundle | **High** | [S5] |
| maxDuration: Hobby 300/300; Pro & Ent 300 default / 800 max / 1800 beta | **High** | [S5], [S6], [S28] |
| Runtime Cache via `getCache()` is available on all plans, 2 MB/item | **High** | [S10], [S30] |
| `s-maxage` (+`stale-while-revalidate`, `stale-if-error`) is the only CDN-cache knob for function responses | **High** | [S9] |
| Token deploys: `VERCEL_TOKEN`, `--scope`, `--prod`, `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` to skip linking | **High** | [S12], [S15], [S17] |
| `vercel env add NAME ENV --value … --sensitive --yes` / stdin forms | **High** | [S13] |
| `--temporary` = anonymous project, always production, local build, refused in CI/already-linked, prints claim URL | **High** | CLI source [S23] + doc mention [S11] + claim flow [S19] |
| `api/` functions are picked up **while using the Vite preset** | **Moderate** | Docs describe `api/` generically for projects with/without frameworks ([S3], [S4]) and never exclude static presets; Vercel's build output always merges `api/` functions. Not stated in one sentence. **Mitigation:** verify once with `vercel deploy` and `curl /api/health`; if a preset ever swallowed them, set `"framework": null` + `buildCommand`/`outputDirectory` explicitly. |
| Exact TTL of an anonymous deployment | **UNKNOWN** | Server-side `expiresAt`; CLI only prints the remaining time [S23] |
| Anonymous deploys with functions / env vars / logs | **UNKNOWN** | Not documented; the anonymous project has no env-var surface |
| Whether `vercel` CLI uploads `.gitignore`d files | **Moderate** | `.vercelignore` + a built-in default ignore list are documented ([S11]); `.gitignore` is not mentioned as a filter |

---

## 9. Copy-paste commands

All commands assume the repo root (`/home/ondokai/Projects/llm-selector`), Node ≥ 22, and
`vercel@65.x`. Use `npx vercel@65` if you prefer not to install globally.

### 9.1 One-time local setup

```bash
# CLI (65.x is current)
npm i -g vercel@65        # or: npx vercel@65 --version
vercel --version

# make the uploaded tree small (build happens on Vercel)
cat > .vercelignore <<'EOF'
dist/
node_modules/
research/
pesquisas/
tests/
docs/
.agents/
.github/
*.tsbuildinfo
EOF
```

### 9.2 Static SPA + API deploy (interactive first run, then non-interactive)

```bash
# 1. authenticate (opens browser once; not a dashboard click-through)
vercel login

# 2. link this directory to a project (creates it if absent)
vercel link --yes --project llm-selector --scope <team-slug>

# 3. sanity-check the build the way Vercel will run it
pnpm install --frozen-lockfile
pnpm run build                     # build-catalog -> tsc -b --noEmit -> vite build

# 4. preview deployment (prints the URL on stdout)
vercel deploy

# 5. verify the SPA fallback and the API on that preview
vercel curl / --deployment <preview-url>
vercel curl /api/health --deployment <preview-url>
vercel curl /api/catalog --deployment <preview-url>

# 6. production
vercel deploy --prod

# 7. verify production
vercel curl /api/health --deployment <production-url>
vercel logs --environment production --level error --since 5m
```

### 9.3 Temporary (unauthenticated) deploy

```bash
# no login, no token. Must be a LOCAL shell (refused in CI) and an UNLINKED directory.
# Always targets production. The build runs locally and is uploaded prebuilt.
vercel deploy --temporary

# stdout = deployment URL; stderr = "This deployment expires in … Claim it to keep it live: <claimUrl>"
# capture both if you need them in a script:
vercel deploy --temporary >"$TMPDIR/url.txt" 2>"$TMPDIR/claim.txt"
cat "$TMPDIR/url.txt" "$TMPDIR/claim.txt"

# claim later: open the printed claim URL, or reuse the stored state
#   .vercel/anonymous.json -> { projectId, token, claimUrl, expiresAt }
# claim page shape: https://vercel.com/claim-deployment?code=<code>&returnUrl=<url>
```

### 9.4 Token deploy (fully non-interactive, CI-friendly)

```bash
export VERCEL_TOKEN='<token>'                # Full Account / Team / Project scope, see §4.2
export VERCEL_ORG_ID='team_xxx'              # skip `vercel link` entirely
export VERCEL_PROJECT_ID='prj_xxx'

# optional but explicit when a token can see several teams
SCOPE=(--scope <team-slug>)

# preview
vercel deploy "${SCOPE[@]}" --yes

# production, writing the URL to a file
vercel deploy "${SCOPE[@]}" --yes --prod > deployment-url.txt

# redeploy a specific earlier deployment / inspect
vercel redeploy <deployment-url>
vercel inspect <deployment-url>
```

```bash
# first time only: create the project non-interactively with a token
vercel link --yes --project llm-selector "${SCOPE[@]}" --token "$VERCEL_TOKEN"
```

### 9.5 Environment variables

```bash
# secrets, production + preview, value from stdin (not argv, not history)
printf '%s' "$ARTIFICIAL_ANALYSIS_API_KEY" \
  | vercel env add ARTIFICIAL_ANALYSIS_API_KEY production --sensitive --yes
printf '%s' "$ARTIFICIAL_ANALYSIS_API_KEY" \
  | vercel env add ARTIFICIAL_ANALYSIS_API_KEY preview    --sensitive --yes

printf '%s' "$OPENROUTER_API_KEY" \
  | vercel env add OPENROUTER_API_KEY production --sensitive --yes

# non-secret, explicit type
vercel env add SOM_PUBLIC_URL production --value "https://llm-selector.vercel.app" --type config --yes

# overwrite / rotate
printf '%s' "$NEW_AA_KEY" | vercel env add ARTIFICIAL_ANALYSIS_API_KEY production --sensitive --yes --force

# inspect (names + targets only)
vercel env ls production

# pull for local dev (merges into the target file)
vercel env pull .env.local --environment=production

# env changes only affect NEW deployments
vercel deploy --prod --yes

# one-off variables for a single deployment (not persisted to the project)
vercel deploy --build-env NODE_OPTIONS=--max-old-space-size=4096 \
              --env FEATURE_FLAG=1 --yes
```
