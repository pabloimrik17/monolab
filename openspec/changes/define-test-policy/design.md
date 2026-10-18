# Design

## Context

See proposal.md for the motivation. This change stacks on `ci-nx-cache`, which splits CI into `lint`, `tests` and `build` jobs behind a `main` gate and makes every test target cacheable.

**Where the policy comes from:**

- **The owner's grill of 2026-10-17/18**, recorded in `docs/GLOSSARY.md` (Workspace context).
- **ADR 0006 and ADR 0007**: use-case integration tests inside module packages. They are amended, not replaced.
- **The work-fleet convention** (beads `WebstormProjects-tdhc.13` and eci-av `docs/adr/0001-four-test-kinds.md`): four kinds, with integration-platform faking the use cases. The name `integration-platform` was settled in this grill and posted back to tdhc.13.

**Baseline, measured 2026-10-17:**

- **Unit coverage, every source file counted.** Local run; integration tests did not run because Docker is unavailable on the owner's machine.

| Project | Lines | Branches | Functions | Statements |
|---|---|---|---|---|
| drizzle-neverthrow, http-client, react-clean, react-hooks, ts-types, qup-shared | 100 | 100 | 100 | 100 |
| investlab-platform | 98.8 | 95.3 | 88.6 | 95.3 |
| investlab-api | 93.5 | 85.4 | 91.7 | 91.3 |
| qup-domain | 88.8 | 89.0 | 92.5 | 88.9 |
| solid-clean | 88.2 | 50.0 | 100 | 88.2 |
| investlab-core | 61.1 | 100 | 50.0 | 61.1 |
| investlab (web) | 53.3 | 46.7 | 47.3 | 53.0 |
| investlab-portfolio (unit only) | 27.1 | 43.9 | 16.8 | 26.3 |
| investlab-quotes (unit only) | 11.7 | 15.1 | 8.1 | 11.9 |
| qup-api | 9.5 | 8.7 | 12.9 | 9.3 |
| qup-web, qup-data | 0 | 0 | 0 | 0 |

- **Mutation scores** (CI artifacts, develop, 2026-10-16): drizzle-neverthrow 100, http-client 100, ts-types 100, react-clean 90.9, react-hooks 81.8, solid-clean 78.9, qup-domain 76.1.

## Goals / Non-Goals

**Goals:**

- Every existing test file is either of the right kind and named for it, or marked legacy, or deleted.
- Every project's config, scripts and CI wiring match the policy, so new tests land in the right place by default.
- Thresholds stop regressions from today's level and ratchet towards the target.

**Non-Goals:**

- Writing missing tests. That includes integration-platform tests for the investlab web, qup-web and qup-api, integration tests for libraries that lack them, and Stryker for the projects without it. They come later, one change at a time.
- Deciding how integration-platform tests call an API. `app.request()` stays until the owner's separate grill settles it.
- Running tests from package sources (`@m0n0lab/source`). That is measured first, in a beads task.
- E2E infrastructure.

## Decisions

### Where the policy lives

The policy lives in three places, each with one job:

- **`docs/adr/0008-test-policy.md`**: the decision and its reasons, the category matrix, the app-unit exception list (empty) and the legacy groups with their issue IDs.
- **The `test-policy` spec**: the testable requirements.
- **One line in `AGENTS.md`**, approved verbatim by the owner. Everything else an agent finds through the ADR.

  ```md
  Write the fewest tests that run the most real code. Full policy: [ADR 0008](docs/adr/0008-test-policy.md).
  ```

ADR 0006's status becomes `amended by ADR-0007, ADR-0008`. ADR 0008 states that integration tests stay at the use case (as ADR 0006 decided) and adds integration-platform tests at the app's entry point.

- *Only a spec*: rejected. Agents read `AGENTS.md`, and the reasons behind the policy belong in an ADR.
- *The full matrix in `AGENTS.md`*: rejected by the owner. It inflates a file every agent loads with content the ADR already holds.

### What happens to each existing test

| Project | Files | Becomes |
|---|---|---|
| apps/investlab-api | `routes/*.routes.test.ts` (3) | Rename to `*.routes.integration-platform.ts`. The harness binds faked use cases instead of real ones over in-memory repositories. |
| | `testing/test-app.ts` | Rewritten to bind a fake per use-case token. |
| | `testing/in-memory-portfolio.ts` | Deleted. |
| | `app.test.ts` | Its `/health`, missing-token and unknown-route cases move to `app.integration-platform.ts` on the new harness. Its cases that wrap `handleError` in a standalone Hono are dropped, because the route tests assert error mapping through real routes. |
| | `errors/error-mapping.test.ts`, `middleware/bearer-auth.test.ts`, `serializers/dto-serializers.test.ts` | Deleted once the integration-platform tests cover their files at least as well as before. |
| | `container.test.ts` | Legacy. No test of the right kind exercises the container wiring until E2E exists. |
| apps/investlab | all 9 `*.test.ts(x)` | Legacy. |
| apps/qup-api | all 3 `*.test.ts` | Legacy. |
| packages/qup-domain | `entities/*`, `value-objects/*` (5) | Unit, unchanged. |
| | `use-cases/*` (11) | Legacy (mocked repositories). |
| packages/investlab-portfolio | `domain/**` (3) | Unit, unchanged. |
| | `data/contracts/*.dto.test.ts` (3), `data/server/*.mapper.test.ts` (2) | Legacy. |
| | `*.integration.ts` (16) | Unchanged. The Vitest projects become `integration:server` and `integration:client`. |
| packages/investlab-quotes | `quote.dto.test.ts`, `batch.test.ts` | Legacy. |
| | `*.integration.ts` (2) | Unchanged; the Vitest projects are renamed as in portfolio. |
| packages/investlab-core | `errors.test.ts`, `errors.test-d.ts` | Unchanged (`RemotePortError<E>` is a shared generic). |
| | `api-error.dto.test.ts` | Legacy. |
| packages/investlab-platform | `investlab-api-client.test.ts`, `shared/http-client.test.ts` (MSW) | Rename to `*.integration.ts`, in a new `integration` Vitest project. |
| | config and module tests (3) | Unit, unchanged. |
| packages/drizzle-neverthrow | `wrap.integration.ts` | Imports `./index.ts` instead of `./wrap.ts`. |
| packages/http-client | `package-entry.integration.ts` | Deleted, together with its `integration` Vitest project, its `test:integration*` scripts and the `build` dependencies in `project.json`. |
| packages/react-clean | `base.viewmodel.browser.test.tsx` | Rename to `base.viewmodel.integration.tsx`. |
| packages/react-hooks | `use-did-mount.browser.test.tsx` | Rename to `use-did-mount.integration.tsx`. |
| packages/ts-configs | `vitest.config.ts` (no tests) | Deleted (exempt project). |
| apps/demo | whole project | Deleted. The codecov-plugin note it carries moves into `apps/investlab/vite.config.ts`, which `apps/green-beard/vite.config.ts` then cites. |

Everything else (solid-clean, ts-types, the experiments plugin and the remaining library tests) stays as it is.

Legacy renames keep the `.test.ts` ending (`foo.legacy.test.ts`), so the unit project still collects them, coverage and Stryker keep excluding them as test files, and they keep running until they are replaced.

### Vitest projects and scripts

- **Projects are named after the kind:** `unit`, `integration`, `integration-platform`, `types`. Projects split by side use `integration:server` and `integration:client`. An app with only legacy tests (investlab web, qup-api) keeps a single default project; it gains no reserved project until it has a test of that kind.
- **Scripts per project:**
    - the aggregate: `test`, `test:watch`, `test:coverage`, `test:changed`, and `test:ui` where it exists today;
    - one group per kind the project has: `test:<kind>`, `:watch`, `:coverage` and `:changed` (no `:coverage` for `types`);
    - `test:browser*` is deleted everywhere.
- **The root `vitest.config.ts`** lists `{apps,packages}/*/vitest.config.ts` and `claude-plugins/*/vitest.config.mjs`.
- **Root scripts:**
    - `mutation:test` and `mutation:test:affected` become `test:mutation` and `test:mutation:affected`;
    - `test:browser*` goes;
    - `test:integration-platform`, `:affected` and `:watch` are added;
    - `investlab:test` and `qup:test` run `-t test` over their apps and packages;
    - `demo:dev` goes.

### Coverage measurement and thresholds

- **`coverage.include`:** each project sets it to its sources (`src/**/*.{ts,tsx}`, `app/**/*.{ts,tsx}` for the investlab web, `scripts/**/*.mjs` for the experiments plugin). `coverage.exclude` adds type tests, integration and integration-platform files, `**/testing/**`, Vitest setup files and generated folders (`.react-router`). Test files are already excluded by Vitest's defaults, `*.legacy.test.*` included.
- **Thresholds only on the full run.** Each `vitest.config.ts` declares its thresholds through a helper in `@m0n0lab/vitest-config`. The helper returns no thresholds when the run is filtered with `--project`, so `test:<kind>:coverage` stays informational without repeating flags in every script.
    - *Explicit `--coverage.thresholds.*=0` flags on every per-kind script*: rejected. Four flags across about 30 scripts.
    - *Thresholds only in CI flags*: rejected. A local `test:coverage` would not match CI.
- **Floors** apply the spec rule to the measurement taken after the file moves. Provisional values from the baseline table:
    - 80 everywhere for the 100% libraries, investlab-platform and qup-domain;
    - solid-clean 80/50/80/80;
    - investlab-core 60/80/50/60;
    - investlab web 50/45/45/50;
    - qup-api 5/5/10/5;
    - 0 for qup-web, qup-data and green-beard.

  investlab-portfolio, investlab-quotes, investlab-api and the experiments plugin are measured on the PR's CI run (Docker is available there) before their thresholds are committed.

### Mutation

- **Thresholds.** `stryker.config.base.mjs` sets thresholds `{ high: 90, low: 80, break: 80 }`. Only qup-domain and solid-clean keep an override (`low: 75, break: 75`); the other five packages drop theirs, because they already meet 80.
- **Excluded files.** `mutate` also excludes `*.integration-platform.{ts,tsx}`. `*.legacy.test.ts` is already excluded through `*.test.ts`.
- **Dashboard.** The `dashboard` reporter is added only when `STRYKER_DASHBOARD_API_KEY` is set. CI passes that secret on push to `main`/`develop` only, so PR runs never upload.
- **PR gate.** The `build` job runs `nx affected -t test:mutation --parallel=1` on pull requests and keeps `run-many` on push. PR runs restore the Stryker incremental cache with the existing fallback to `develop` and do not save it, so the `develop` baseline stays clean.
- **Archive order.** `add-mutation-testing` is archived before this change, because its `mutation-testing` spec must exist for this change's MODIFIED and RENAMED deltas. The ten dashboard tasks it leaves open are covered here.

### Legacy check

- **The list.** `docs/legacy-tests.txt` holds the sorted paths of every `*.legacy.test.*` file.
- **The check.** A root script `lint:legacy-tests`, `git ls-files '*.legacy.test.*' | diff docs/legacy-tests.txt -`, fails when a legacy file appears that is not on the list, or when a list entry has no file left. So adding a legacy test fails, and deleting one requires deleting its line.
- **Wiring.** Nx metadata goes in the root `project.json`; the script is added to `nx.includedScripts`, the documented exception; and the CI `lint` job runs the check.
- **The ADR** lists the groups and the issue that retires each group.

### CI

- **Tests job:** runs `test:coverage` (affected on PR, all on push) in place of `test:unit:coverage`, `test:integration` and `test:types`. The aggregate includes the `types` projects.
- **Codecov matrix:** drops `ts-configs` and adds `plugin-experiments:claude-plugins/experiments`. `codecov.yaml` follows the same change, and its patch target becomes 80% (threshold 0).

## Risks / Trade-offs

- [Deleted investlab-api unit tests asserted something the route tests do not] → Delete them only after the integration-platform run covers `error-mapping.ts`, `bearer-auth.ts` and `dto-serializers.ts` at least as well as the unit run did. Compare the two coverage reports in the PR.
- [The `--project` detection in the threshold helper misreads an invocation] → It only switches thresholds off for filtered runs. If it fails, the safe direction is a filtered run failing on thresholds, which shows up at once; the fallback is explicit CLI flags on the per-kind `:coverage` scripts.
- [The PR mutation gate lengthens CI] → Incremental mode re-tests only mutants in changed code; the Docker-backed packages have no Stryker configuration yet.
- [Thresholds for Docker-backed packages are unknown until CI runs] → They are set from the PR's own CI measurement before merge, never guessed.
- [Renamed or deleted helpers trip knip or fallow] → Run `pnpm nx run-many -t lint` and `pnpm run lint:fallow` after each group of moves.
- [Archiving `add-mutation-testing` syncs a spec describing outdated per-type thresholds] → This change modifies those requirements in the same stack, before anyone builds on them.

## Migration Plan

1. Archive `add-mutation-testing`, then land this change on top of `ci-nx-cache` in the PR stack.
2. The PR's CI run measures coverage for the Docker-backed packages; thresholds are committed from it.
3. Rollback: revert the PR. Renames are plain `git mv`, so history follows the files.

## Open Questions

- How integration-platform tests call the API (in-process `app.request()` or a started server). It is decided in the owner's separate grill and then applied to the investlab-api harness. The specs say "a request to its API" and do not change either way.
