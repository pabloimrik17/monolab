# Design

## Context

`.github/workflows/ci.yml` has one `main` job that runs every step in sequence and hands each Nx command's tasks to three Nx Cloud agents (`nx-cloud start-ci-run --distribute-on="3 linux-medium-js-playwright"`). The Nx Cloud organization was disabled on 2026-10-15 for exceeding the Hobby plan, and since then tasks run on the GitHub runner. The steps that restore and save `.nx` to the GitHub Actions cache run only when the repository variable `NX_NO_CLOUD` is `'true'`, and it is `false`. Their key (`hashFiles(pnpm-lock.yaml)-hashFiles(nx.json)`) also never changes between commits, so a saved entry could never be refreshed.

Measured on the last runs: lint ≈60s, mutation ≈56s, unit tests ≈38s, integration tests ≈30s, build ≈30s, check-exports ≈28s, typecheck ≈23s, setup ≈1 min. Runs with agents (Sept–Oct 15) took 4.1–9.2 min, ≈5.5 median; runs without them took 4.6–6.1 min.

The protected-branch ruleset on `main` and `develop` requires a single status check named `main`. `ci.yml` is an Nx `sharedGlobals` input, so any edit to it marks every project affected.

Nx config conventions in this repo: commands live in `package.json` scripts and Nx metadata lives in `project.json` or `nx.json`. A plugin-inferred target is preferred over a script when it runs the same command.

## Goals / Non-Goals

**Goals:**

- A CI run never starts from an empty Nx cache, whatever the Nx Cloud quota.
- Steps that do not depend on each other stop waiting for each other.
- `typecheck` and the other deterministic targets hit the cache.

**Non-Goals:**

- Changing which tests run, how coverage is measured or when mutation runs. That belongs to `define-test-policy`, which stacks on top of this change.
- Running tests from package sources instead of `dist` (`@m0n0lab/source` condition), which is measured separately before any decision.
- Self-hosting a remote cache or moving off Nx Cloud.

## Decisions

### Nx Cloud as remote cache, no agents

Keep `NX_CLOUD_ACCESS_TOKEN` and drop `start-ci-run` and `.nx/workflows/agents.yaml`.

- *Keep agents*: rejected. They bought no measurable speed (tasks take seconds, and shipping them costs about what it saves), and they cannot share work with parallel GitHub jobs: one workflow run is one Nx Cloud execution, so three jobs would queue on the same three agents after paying three setups.
- *Drop Nx Cloud entirely*: rejected by the owner. While the quota lasts, the remote cache is also shared with developer machines through `nx login`.

The quota still runs out mid-month (500 credits per run, ~190 runs a month against 50,000 credits). From then on the GitHub Actions cache carries the work, which is why it is now saved unconditionally.

### GitHub Actions cache of `.nx`, per job and per commit

Each job restores `.nx` with `actions/cache/restore` and saves it with `actions/cache/save` under `if: ${{ !cancelled() }}`, using the key `nx-${{ runner.os }}-<job>-${{ github.ref_name }}-${{ github.sha }}`. Restore keys fall back to `nx-${{ runner.os }}-<job>-${{ github.ref_name }}-`, then `nx-${{ runner.os }}-<job>-develop-`.

- The whole `.nx` directory is cached, not only `.nx/cache`. Nx keeps its cache index in `.nx/workspace-data`, and cache entries restored without their index can be rejected as unknown.
- The key is per job because each job runs different targets; a shared key would make the last job to finish overwrite the others.
- The key is per commit because GitHub cache entries are immutable; with a key that stays the same, a branch saves once and never again.
- `nx.json` sets `maxCacheSize` so that three jobs saving on every commit stay well under the repository's 10 GB GitHub cache limit. The exact size is tuned after the first runs.

### Three parallel jobs and a `main` gate

| Job | Runs |
|---|---|
| `lint` | `nx sync:check`, `build:check-exports`, config checks, OpenSpec validation, lint (affected on PR, all on push), fallow audit (PR) |
| `tests` | `test:unit:coverage`, `test:integration` (Docker-tagged projects without distribution), `typecheck`, `test:types`, Codecov matrix detection, coverage artifacts |
| `build` | `build`, bundle analysis, mutation (push to `main`/`develop`, `--parallel=1`) and its Stryker cache and reports |
| `main` | `needs: [lint, tests, build]`, `if: always()`, fails when any needed job failed or was cancelled |

The final `main` job keeps the check name the ruleset requires, so no ruleset edit is needed. `upload-codecov` changes from `needs: main` to `needs: tests` and reads the matrix from the tests job's outputs. Only the `tests` and `build` jobs install Playwright Chromium, because browser-mode tests and browser-mode Stryker need it. The `test:mutation --parallel=1` setting is kept, because browser-mode Stryker runs fail when they overlap on one runner.

- *Keep one job*: rejected. Steps that share nothing still run one after another (≈5.5 min).
- *A job per target*: rejected. Each job pays ≈1 min of setup, and several targets need the same `^build` work.

### Typecheck through the inferred target

Delete the `typecheck` script from the 17 `package.json` files where it is exactly `tsc --build tsconfig.json --emitDeclarationOnly`. The `@nx/js/typescript` plugin then infers a cached `typecheck` with inputs and outputs derived from the tsconfig, as it already does for `ts-configs` and `demo`. `apps/investlab` keeps its script (`react-router typegen && tsc --noEmit && tsc --build tsconfig.node.json`) and gets `cache: true`, inputs and outputs in `project.json`; `apps/green-beard` already has them.

- *`cache: true` in `targetDefaults.typecheck`*: rejected. The scripts would still lack outputs, so a cache hit would not restore the declarations other projects read.

### `targetDefaults` for the remaining targets

- `test:integration` and `test:integration:coverage`: `cache: true` with the same inputs as `test:unit`. Outputs match `test:unit` and `test:unit:coverage`: JUnit and HTML, plus `coverage` only for the `:coverage` target, because a cached `coverage/` the run never wrote would be restored over a fresh one. Integration tests fake everything beyond the system boundary, and the container images they start are pinned by tag, so the result depends only on the inputs.
- `build:check-exports`: `cache: true`, inputs `production` plus the build output (`dependsOn` keeps `build`).
- `lint:eslint:config-check`: `cache: true`, inputs `default` plus `{workspaceRoot}/eslint.config.ts`.

### Dependency cache

Keep the `node_modules` cache (install takes ≈9s on a hit) and drop `cache: pnpm` from `setup-node`. If install time regresses on lockfile changes, swap the two; the spec only requires one.

## Risks / Trade-offs

- [Nx rejects restored cache entries as unknown] → Cache `.nx` whole so the index travels with the entries. If Nx still refuses them, set `NX_REJECT_UNKNOWN_LOCAL_CACHE=0` in the jobs and note why.
- [Three jobs triple the setup cost] → Jobs run in parallel, so wall time drops; Actions minutes are free for public repositories.
- [GitHub cache eviction (10 GB, least recently used)] → `maxCacheSize` caps each entry; a branch falls back to `develop`'s cache when its own is evicted.
- [Cache poisoning from pull requests] → GitHub scopes caches saved by a PR to that PR's ref, so they never reach `develop`. Fork PRs get no secrets and, once anonymous access is closed, no remote cache.
- [An integration-test image tag changes upstream under the same tag] → Pin images by tag in the setup files (verified in tasks). A moved tag can at worst serve a stale pass until the inputs change.
- [The ruleset requires a check name that disappears] → The gate job keeps the name `main`. Verify on the PR that the required check reports.

## Migration Plan

1. One PR with the workflow, `nx.json`, `project.json` and `package.json` edits. Because `ci.yml` is a shared global, the PR runs the whole suite and validates every job.
2. Owner sets anonymous access to "none" in Nx Cloud workspace settings and deletes the unused `NX_NO_CLOUD` repository variable.
3. After merge, the first push to `develop` seeds each job's `.nx` cache; the next PR shows restored tasks.
4. Rollback: revert the PR. No data or published artifact depends on it.
