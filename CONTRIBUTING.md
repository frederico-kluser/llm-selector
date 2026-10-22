# Contributing to SOM

Thanks for helping. Two rules matter more than any other: **never commit third-party data** and
**never break the "missing data is visible" contract**.

## Setup

```bash
pnpm install
pnpm dev        # API :8899 + web :5173
pnpm test       # 33 unit tests
pnpm typecheck
```

Node 24+ and pnpm 11+ (see `.nvmrc` / `packageManager`).

## Ground rules

- **Data stays upstream.** Do not add benchmark or catalogue snapshots to git. `public/data/catalog.json`
  is generated and git-ignored; `shared/` contains only code.
- **Nulls are not zeros.** A model without a price or a score must render `—` and sink in sorts. If a
  change makes missing data look like a value, it will be rejected.
- **Semantics belong in tests.** Any new filter needs a case in `tests/core.test.ts` proving AND/OR
  behaviour and that it participates in facet counts.
- **Charts get no new dependencies.** They are hand-written SVG so they stay accessible and small.
- **Motion is optional.** Respect `prefers-reduced-motion`; animate only `transform`/`opacity`.

## Branch names

The local OSS hooks (and the GitHub ruleset) reject direct pushes to `main`, so work on a branch
named `<type>/<slug>` where `<type>` is one of:

`feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `test` · `build` · `ci` · `revert` · `hotfix` · `release`

`chore/` is **not** an accepted prefix — use `build/` for tooling and repo housekeeping. Dependabot and
Renovate branches are exempt.

## Commits

Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`). One logical change per
PR, squash-merged to `main`.

## Sign-off

By submitting a pull request you certify you wrote the contribution or have the right to submit it
under the project licence (Developer Certificate of Origin 1.1). Add `Signed-off-by: Your Name
<you@example.com>` to your commits (`git commit -s`).

## Pull requests

1. Fork, branch from `main` (`feat/`, `fix/`, … — see above).
2. Fill in the PR template: what changed, why, and how you verified it.
3. `pnpm typecheck && pnpm test && pnpm build` must pass locally; CI enforces the same.
4. Add a CHANGELOG entry under `## [Unreleased]` for user-visible changes.

## Releasing

```bash
python3 ~/.dsh/skills/opensource-project/scripts/oss-version.py next --json   # SemVer from commits
python3 ~/.dsh/skills/opensource-project/scripts/oss-changelog.py --write      # generated section
bash ~/.dsh/skills/opensource-project/scripts/oss-gate.sh release --version X.Y.Z
git tag -a vX.Y.Z -m "vX.Y.Z — …" && git push origin vX.Y.Z
gh release create vX.Y.Z --verify-tag --notes-file notes.md
```

The release event triggers `publish.yml`. Do not create releases by hand without the tag.

## Adding a data source

Include, in the PR description: the endpoint, the licence/terms link, the attribution line you will
render, and whether it can be called from the browser (CORS) or needs the server. Anything that cannot
answer those four questions will not be merged.
