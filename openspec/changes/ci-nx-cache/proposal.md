# Proposal

## Why

Every CI run starts with a cold Nx cache from the day the Nx Cloud quota runs out until the next monthly reset. The Hobby plan grants 50,000 credits a month and every CI run costs 500 of them, agents or not; the repository made 191 CI runs in the 30 days before 2026-10-17, so the quota ran out on 2026-10-15. The GitHub Actions copy of `.nx` is only saved when `NX_NO_CLOUD` is `'true'`, and the variable is `false`, so after that date nothing is cached between runs. On top of that, `typecheck` is uncached in 18 of 23 projects, and every step runs one after another in a single job. The Nx Cloud agents do not offset any of this: CI runs with agents (≈5.5 min median) were no faster than runs without them (4.6–6.1 min).

## What Changes

- **Nx Cloud becomes a remote cache only.** The `nx-cloud start-ci-run` step and the three distributed agents are removed (`.nx/workflows/agents.yaml` goes too). `NX_CLOUD_ACCESS_TOKEN` stays, so tasks read and write the remote cache while the monthly quota lasts, in CI and on developer machines logged in with `nx login`.
- **The GitHub Actions cache always holds `.nx`.** It is restored and saved on every run, whatever the state of Nx Cloud, with a key that changes per commit so each run can save. When the quota runs out, CI keeps its cache.
- **The single `main` job splits into parallel jobs**: lint, tests and build plus mutation. A final job, still named `main`, depends on all of them, so the branch-protection ruleset, which requires the `main` check, keeps working unchanged. The `upload-codecov` job takes its coverage artifacts from the tests job.
- **Every deterministic Nx target is cacheable, with explicit inputs and outputs:**
    - `typecheck`: the 17 package.json scripts identical to the `@nx/js/typescript` inferred command (`tsc --build tsconfig.json --emitDeclarationOnly`) are deleted, so the cached inferred target takes over. `apps/investlab`'s custom script gets cache config in its `project.json`.
    - `test:integration` and its variants, `build:check-exports` and `lint:eslint:config-check` become cacheable through `targetDefaults`.
    - `*:changed`, `*:watch`, `*:fix`, `test:ui`, `db:*`, `dev` and `lint:fallow` stay uncached on purpose (`lint:eslint:fix` loses its `cache: true`: a cache hit would skip rewriting the sources).
- **CI leftovers are removed:** the "Debug Nx Cloud variable" step, the `~/.cache/Cypress` path in the dependency cache (no project uses Cypress), the `NX_NO_CLOUD` switch, and one of the two overlapping dependency caches (`setup-node`'s pnpm store cache and the `node_modules` cache).
- **Manual step for the owner:** the repository is public and Nx Cloud lets anyone without a token read and write the cache by default. Set anonymous access to "none" in the Nx Cloud workspace settings.

## Capabilities

### New Capabilities

- `ci-task-caching`: how CI and local runs reuse Nx task results: which targets are cacheable and how, the Nx Cloud remote cache, and the GitHub Actions copy of the local cache that survives the quota running out.
- `ci-job-layout`: how the CI workflow is split into jobs, what each job runs, and the stable `main` check that branch protection requires.

### Modified Capabilities

None. No existing spec states how CI caches tasks or lays out its jobs.

## Impact

- `.github/workflows/ci.yml`: restructured into parallel jobs; Nx Cloud distribution and leftovers removed; `.nx` cache always saved. The file is an Nx `sharedGlobals` input, so the PR marks every project affected and runs the full suite once.
- `nx.json`: `targetDefaults` for `typecheck`, `test:integration*`, `build:check-exports` and `lint:eslint:config-check`.
- `package.json` of 17 projects: duplicate `typecheck` script removed. `apps/investlab/project.json`: typecheck cache config.
- `.nx/workflows/agents.yaml`: deleted.
- GitHub repository settings: the `NX_NO_CLOUD` variable becomes unused and can be deleted. The ruleset keeps requiring `main`.
- Nx Cloud workspace settings: anonymous access set to "none" (manual).
- No published package changes and no exports change; no attw validation needed.
