# Tasks

## 1. Cacheable targets

- [ ] 1.1 Delete the `typecheck` script from the 17 `package.json` files whose script is exactly `tsc --build tsconfig.json --emitDeclarationOnly` (apps/investlab-api, apps/qup-api, packages/drizzle-neverthrow, http-client, investlab-core, investlab-database, investlab-platform, investlab-portfolio, investlab-quotes, qup-data, qup-domain, qup-shared, react-clean, react-hooks, solid-clean, ts-types, vitest-config); verify with `NX_DAEMON=false pnpm nx show project @m0n0lab/qup-domain --json` that `typecheck` is the `@nx/js/typescript` target with `cache: true`, and that `pnpm nx run-many -t typecheck` passes
- [ ] 1.2 Add `cache: true`, inputs and outputs for `typecheck` to `apps/investlab/project.json` (outputs: `.react-router/types`, `out-tsc`, `tsconfig*.tsbuildinfo`); verify that `pnpm nx run @m0n0lab/investlab:typecheck` run twice reports a cache hit the second time
- [ ] 1.3 Add `targetDefaults` in `nx.json` for `test:integration` and `test:integration:coverage` (cache, the same inputs as `test:unit`, JUnit and coverage outputs), `build:check-exports` (cache, `production` inputs) and `lint:eslint:config-check` (cache, `default` plus `{workspaceRoot}/eslint.config.ts`); verify that `pnpm nx run @m0n0lab/react-hooks:build:check-exports` and `pnpm nx run @m0n0lab/http-client:test:integration` hit the cache on a second run
- [ ] 1.4 Set `maxCacheSize` in `nx.json` and verify that `pnpm nx show projects` still loads the workspace without warnings
- [ ] 1.5 Confirm that the integration-test container images are tag-pinned (`postgres:17-alpine`, `redis:7-alpine` in the `vitest-integration-global-setup.ts` files and in `drizzle-neverthrow/src/wrap.integration.ts`) and that no setup uses `latest`
- [ ] 1.6 Run the spec check from `ci-task-caching`: for every project, `NX_DAEMON=false pnpm nx show project <name> --json` shows `cache: true` on `build`, `build:check-exports`, `typecheck`, every `lint:*` except `lint:fallow`, and every `test*` target except `*:changed`, `*:watch`, `test:ui` and `test:mutation:report`

## 2. Nx Cloud as remote cache only

- [ ] 2.1 Remove the "Start Nx Cloud CI Run" step, the "Debug Nx Cloud variable" step, the `NX_NO_CLOUD` env and every `NX_CLOUD_DISTRIBUTED_EXECUTION=false` prefix from `.github/workflows/ci.yml`; keep `NX_CLOUD_ACCESS_TOKEN`; verify with `grep -nE "start-ci-run|NX_NO_CLOUD|DISTRIBUTED_EXECUTION" .github/workflows/ci.yml` returning nothing
- [ ] 2.2 Delete `.nx/workflows/agents.yaml` (and the directory if empty) and verify that no workflow or doc still references it (`git grep -n "agents.yaml"`)

## 3. Parallel jobs and the `main` gate

- [ ] 3.1 Split `.github/workflows/ci.yml` into `lint`, `tests` and `build` jobs as laid out in design.md, each with checkout, pnpm, Node, the dependency cache, `nx-set-shas` and the per-job `.nx` restore/save (key `nx-<os>-<job>-<ref>-<sha>`, restore keys falling back to the same job on the branch, then on `develop`); install Playwright Chromium only in `tests` and `build`; verify with `actionlint .github/workflows/ci.yml` (or `pnpm dlx` it) reporting no errors
- [ ] 3.2 Move the Codecov matrix detection and the coverage-artifact upload into `tests`, expose `matrix` as a `tests` job output, and change `upload-codecov` to `needs: tests`; verify on the PR that `upload-codecov` gets the full matrix (ci.yml is a shared global, so every package is affected)
- [ ] 3.3 Keep mutation testing, its Stryker cache and its report upload in `build`, with `--parallel=1` and the same push-only condition; verify by reading the job that the condition and flag are unchanged
- [ ] 3.4 Add the final `main` job with `needs: [lint, tests, build]` and `if: always()` that fails when any needed result is `failure` or `cancelled`; verify on the PR that the required `main` check reports, and that it fails when a job fails (temporarily break one lint rule in a throwaway commit, then drop the commit)
- [ ] 3.5 Drop `cache: pnpm` from `setup-node`, keep the `node_modules` cache without the `~/.cache/Cypress` path; verify that the install step stays under 20s on the PR run, otherwise swap the two caches as design.md allows

## 4. Verification on CI

- [ ] 4.1 On the PR run, compare wall time with the last single-job runs (4.6–6.1 min) and record the result in the PR description
- [ ] 4.2 Push a follow-up commit that touches one package and confirm in the logs that tasks of untouched projects are read from cache in all three jobs (`[local cache]` or `[remote cache]`)

## 5. Manual settings (owner)

- [ ] 5.1 In Nx Cloud workspace settings, set access for requests without a token to "none"; verify that the settings page shows it, and that a fresh clone in a temporary `HOME` (no `nxcloud.ini`, no `NX_CLOUD_ACCESS_TOKEN`) running `pnpm nx run @m0n0lab/ts-types:build` logs no remote cache hit or upload
- [ ] 5.2 Delete the `NX_NO_CLOUD` repository variable and confirm with `gh variable list` that it is gone

## Workflow follow-up

- Merge this change before `define-test-policy`, which stacks on top of it in the same PR stack.
- Archive the change after the PR merges and the first `develop` push has seeded the job caches.
