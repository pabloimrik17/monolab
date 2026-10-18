# Design

## Context

See proposal.md for the motivation. This change stacks on `ci-nx-cache`, which splits CI into `lint`, `tests` and `build` jobs behind a `main` gate and makes every test target cacheable.

**Where the policy comes from:**

- **The owner's grill of 2026-10-17/18**, recorded in `docs/GLOSSARY.md` (Workspace context).
- **ADR 0006 and ADR 0007**: use-case integration tests inside module packages. They are amended, not replaced.
- **The work-fleet convention** (beads `WebstormProjects-tdhc.13` and eci-av `docs/adr/0001-four-test-kinds.md`): four kinds, with integration-platform faking the use cases. The name `integration-platform` was settled in this grill and posted back to tdhc.13.
- **The owner's grill of 2026-10-18 on the API harness and load tests.** The harness follows the fleet's pattern (prowler `BrowserHarness`, eci-av page suites): the harness owns fakes, DI rebinds and launch; tests call domain-named methods; assertions stay in the test. Two monolab variants are posted back to tdhc.13: APIs are driven over real HTTP, and the lifecycle uses `await using` instead of `onTestFinished`.

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
- The UI harness. The rule applies to it (base harness, one harness per page, `await using`); its concrete design waits for the first UI integration-platform test.
- Running tests from package sources (`@m0n0lab/source`). That is measured first, in a beads task.
- Staging, and with it e2e and load infrastructure and the load-test tool.
- Frontend performance budgets (web vitals, bundle size, requests per page). They are single-user and deterministic, so they are not load tests; they are named here only so nobody files them under load.

## Decisions

### Where the policy lives

The policy lives in three places, each with one job:

- **`docs/adr/0008-test-policy.md`**: the decision and its reasons, the category matrix, the app-unit exception list (empty), the legacy groups with their issue IDs, the harness pattern with the base harness and one reference suite named as the living guide (no separate harness guide), and the reserved load kind with its prerequisites and the issue holding the tool comparison.
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
| apps/investlab-api | `routes/*.routes.test.ts` (3) | Rename to `*.routes.integration-platform.ts`, rewritten flat on one harness per route file. |
| | `testing/test-app.ts` | Replaced by `testing/base-api-harness.ts` and `routes/*.harness.ts` (see "How integration-platform tests reach an API"). |
| | `testing/in-memory-portfolio.ts` | Deleted. Its builders (`makeInstrument` and friends) move to `@m0n0lab/investlab-portfolio/testing` and `@m0n0lab/investlab-quotes/testing`. |
| | `app.test.ts` | Its `/health`, missing-token and unknown-route cases move to `app.integration-platform.ts` on the base harness. Its cases that wrap `handleError` in a standalone Hono are dropped, because the route tests assert error mapping through real routes. |
| | `errors/error-mapping.test.ts`, `middleware/bearer-auth.test.ts`, `serializers/dto-serializers.test.ts` | Deleted once the integration-platform tests cover their files at least as well as before. |
| | `container.test.ts` | Deleted. The base harness launches the real `createContainer()`, so every integration-platform test exercises the container wiring. |
| apps/investlab | all 9 `*.test.ts(x)` | Legacy. |
| apps/qup-api | all 3 `*.test.ts` | Legacy. |
| packages/qup-domain | `entities/*`, `value-objects/*` (5) | Unit, unchanged. |
| | `use-cases/*` (11) | Legacy (mocked repositories). |
| packages/investlab-portfolio | `domain/**` (3) | Unit, unchanged. |
| | `data/contracts/*.dto.test.ts` (3), `data/server/*.mapper.test.ts` (2) | Legacy. |
| | `*.integration.ts` (16) | Unchanged. The Vitest projects become `integration:server` and `integration:client`. |
| | `src/testing/` (new) | Test-data builders moved from investlab-api, exported through a `./testing` subpath. Excluded from coverage. |
| packages/investlab-quotes | `quote.dto.test.ts`, `batch.test.ts` | Legacy. |
| | `*.integration.ts` (2) | Unchanged; the Vitest projects are renamed as in portfolio. |
| | `src/testing/` (new) | Quote builders, as in portfolio. |
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

### How integration-platform tests reach an API

The test must not know the framework, and the test code that does know it must be one file per app. The fleet's harness pattern gives that shape:

```text
BaseApiHarness (apps/investlab-api/src/testing/base-api-harness.ts)
  launch(): createContainer() -> rebind PLATFORM.Config to constants
            -> rebind PLATFORM.Db / Redis / HttpClient to boundary guards
            -> serve on 127.0.0.1:0 -> url
  [Symbol.asyncDispose] / close(): idempotent
  protected: request(path, init) with the bearer token, json(), fake(TOKEN)
  the only test code that imports hono, @hono/node-server or inversify

PortfolioItemsHarness / InstrumentsHarness / QuotesHarness (routes/*.harness.ts)
  public, domain-named: givenItems([...]), givenListFails(error), listItems(),
  createItem(dto), updateItem(id, dto); return the Response or the DTO parsed
  with its zod schema; no expect inside

test (*.routes.integration-platform.ts)
  await using api = await PortfolioItemsHarness.launch();
  // Arrange / Act / Assert over harness methods, schemas and expect
  /health, auth and 404 cases use BaseApiHarness directly (app.integration-platform.ts)
```

- **Real server, real HTTP.** The harness starts the app on an ephemeral loopback port in the Vitest worker and tests use the standard `fetch`. Same process, so fakes bind per test and coverage counts the server. It exercises what in-process calls skip: the Node adapter, real headers, streamed bodies, SSE and client disconnects (qup-api will need those). Start costs about a millisecond.
    - *`app.request()` (today)*: rejected. Hono's own API in every test file.
    - *`app.fetch(new Request())`*: rejected. Standard, but only frameworks with a fetch handler offer it, and nothing crosses a socket.
    - *supertest, light-my-request, pactum*: rejected. Node-only or their own DSL, for nothing `fetch` lacks.
    - *Hurl, Bruno, Playwright `request`*: rejected for this kind. Black box in another process: no fakes per test, no coverage. Fit for e2e.
- **Real composition root.** `launch()` calls the app's `createContainer()` and rebinds, instead of building a container of fakes by hand. The container's bindings connect on first use, so faking the use cases before the first request keeps Postgres and Redis untouched and Docker out. Every test then runs the real module registration, which retires `container.test.ts`. `PLATFORM.Config` is rebound to constants because `ProcessEnvConfig` reads `process.env`.
    - *Hand-built container (today)*: rejected. It tests a wiring production never runs.
- **Boundary guard.** The three platform ports are rebound to fakes that throw `system boundary reached: PLATFORM.Db` on first use. A use case a test forgot to arrange fails at once with a stack trace naming the route, instead of a Postgres connection timeout. It is MSW's `onUnhandledRequest: error` at the system boundary, and it covers new use cases without a list to maintain.
    - *A "not arranged" fake per use-case token*: rejected. Better message, but a token list that must grow with every use case.
- **Fakes record calls.** With the use case faked, the response proves only the route's output side. `api.itemUpdate.calls` proves the input side: the id taken from the path, the body turned into the use-case input, `notes: null` dropped rather than passed. Together they are the route's whole contract; the package mappers below the use case belong to the integration tests.
- **Lifecycle with `await using`.** The harness implements `Symbol.asyncDispose`; a test opens it with `await using` and the server closes when the scope ends, on failure too. It is a language feature (Node 24 runs it natively, TypeScript 6 types it with `ESNext.Disposable` in `lib`), it shows the resource's lifetime in the test, and it works outside Vitest. No `beforeEach`/`afterEach` for harnesses; one `describe` level at most.
    - *`onTestFinished` registered inside `launch()` (eci-av)*: rejected. Zero ceremony, but it ties the base harness to Vitest and hides the lifetime. A test that writes `const` instead of `await using` leaks a port, which shows as a hanging worker on the first run; `close()` is idempotent so a test may also close early.
    - *`test.extend` fixtures*: rejected. Same coupling, plus a custom `it` import.
- **Builders in the owning package.** Test-data builders live next to the entities they build, exported through a `./testing` subpath of investlab-portfolio and investlab-quotes, so the investlab web's harness reuses them. They are excluded from coverage like every `**/testing/**`.
- **No lint rule** forbidding framework imports in tests. The pattern is applied and corrected in review; agents copy the reference suite. The ADR names `base-api-harness.ts` and `portfolio-items.routes.integration-platform.ts` as the living guide.

### Load tests are reserved

- **Why reserved.** Load figures only mean something against a stable deployment like production, and none exists: there is no staging, only local docker-compose. GitHub runners are shared, so a threshold there fails at random. The policy records the kind and its rules now so the first load test lands in the right shape; the tool is chosen when staging exists.
- **One kind, five profiles.** `load test` is the kind; average-load, stress, spike, soak and breakpoint are profiles a test declares. "Stress" is one profile, not the kind; "performance test" would also cover benchmarks and web vitals.
- **Staging.** The deployment e2e and load tests run against, with a database seeded for tests. The glossary keeps `test environment` for Node-or-browser, so the deployment gets its own word.
- **What is faked.** Only third-party APIs that may not be loaded: Finnhub has a rate limit and terms of use, so its fake stands in. E2E keeps Finnhub real, since a small e2e suite fits the free tier and it is the only test that notices a contract change. That difference is why load is a kind of its own rather than an e2e profile.
- **Which projects.** Every app with a server process: investlab-api, qup-api and the three SSR webs (investlab on React Router, qup-web on SolidStart, green-beard on SvelteKit). Risk orders the rollout: qup-api first, with its opening-time burst and its SSE connections over an in-memory event bus. A static SPA would carry none; what it needs is a performance budget, which is not load.
- **Never in PR CI.** Scheduled or on demand against staging. A SLO failing a pull request on runner noise is the classic mistake.
- **Tool.** Deferred to a beads issue blocked by staging; it holds the comparison. Candidates as of 2026-10-18: Artillery 2.0.34 (npm, YAML plus TypeScript processors, `ensure` thresholds, reuses the zod schemas, SSE through a processor), k6 2.3.0 (Go binary, highest throughput per machine, no npm imports, SSE only through an xk6 build), Gatling JS (native SSE, JVM underneath). Artillery fits the toolchain best today; k6 is the fallback if the generator runs short.

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
- **Archive order.** `add-mutation-testing` is archived before this change, because its `mutation-testing` spec must exist for this change's REMOVED, ADDED and MODIFIED deltas. The ten dashboard tasks it leaves open are covered here.

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
- [A test opens the harness with `const` and leaks the server] → `close()` is idempotent and the worker hangs visibly on the first run; the reference suite shows `await using`.
- [A route resolves a use case the test did not arrange] → The boundary guard fails the request at once naming the port; nothing reaches Postgres or Redis.
- [The real composition root pulls in `varlock/auto-load` or env reads at launch] → `createContainer()` only binds; `index.ts` keeps the env loading and signal handlers, and the harness rebinds `PLATFORM.Config` before any request.
- [The harness diverges from the fleet's `onTestFinished` lifecycle] → Posted to tdhc.13 as the monolab variant, with the reason.

## Migration Plan

1. Archive `add-mutation-testing`, then land this change on top of `ci-nx-cache` in the PR stack.
2. The PR's CI run measures coverage for the Docker-backed packages; thresholds are committed from it.
3. Rollback: revert the PR. Renames are plain `git mv`, so history follows the files.

## Open Questions

None. The API harness question was settled in the 2026-10-18 grill (see "How integration-platform tests reach an API").
