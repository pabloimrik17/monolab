# Tests are the fewest that run the most real code

In October 2026 we gave the monorepo one test policy: write the fewest tests that run the most real code. Until then every project tested differently and agents copied whichever neighbour they found. "Integration" meant four different things; apps ran against in-memory repositories; `qup-domain` tested its use cases against mocked repositories; no project had a coverage threshold; and Vitest counted only the files a test loaded, so qup-api reported 96% coverage while its honest figure was 9.5%. The `define-test-policy` change applies the policy and the `test-policy` spec holds its testable requirements. Terms follow the Workspace glossary ([docs/GLOSSARY.md](../GLOSSARY.md)).

This ADR amends [ADR 0006](./0006-investlab-use-case-integration-tests.md). Integration tests stay at the use case, run through real adapters down to the system boundary, as ADR 0006 decided; this ADR extends that rule to every project and adds integration-platform tests at the app's entry point.

## Kinds of test

There are five kinds of test, plus type tests for libraries. A kind's file suffix, Vitest project and script share one token.

| Kind                 | Enters through                                                       | Runs for real                                                                | Fakes                                                                                  | File                              |
| -------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------- |
| unit                 | a business model or a library's internals                            | the model or internal, in isolation                                          | nothing it owns                                                                        | `*.test.{ts,tsx}`                 |
| integration          | a use case or a library's public API                                 | everything down to the system boundary                                       | only what lies beyond it: HTTP APIs with MSW, databases and caches with Testcontainers | `*.integration.{ts,tsx}`          |
| integration-platform | an app on its platform: its UI in a browser, or a request to its API | the app: pages, routes, middleware, validation, serialization, error mapping | the use cases, and ports whose real implementation leaves the app                      | `*.integration-platform.{ts,tsx}` |
| e2e                  | staging, from the system's outermost edge                            | everything, third-party APIs included                                        | nothing                                                                                | reserved                          |
| load                 | staging, under a declared profile                                    | everything except the faked third parties                                    | third-party APIs it may not load                                                       | reserved                          |
| types                | a library's public types                                             | the type checker                                                             | nothing                                                                                | `*.test-d.ts`                     |

- The use case is where an app's two halves meet: integration tests cover it down to the system boundary, integration-platform tests cover the app down to it. Neither re-tests the other's side.
- `test` runs every kind a project has. `test:<kind>` runs one, with the same `:watch`, `:coverage` and `:changed` variants (`types` has no `:coverage`). A kind split by side uses `<kind>:<side>` projects, such as `integration:server` and `integration:client`.
- Node or a browser is the test environment, set by the Vitest project. It is never a kind: no file is named `*.browser.test.*` and no script is named `test:browser`.
- Type tests guard the public types of published libraries. Another package may add them only for an exported generic other packages build on, such as `RemotePortError<E>` in investlab-core. Apps and plugins carry none.

## What each project category tests

| Category                              | unit                  | integration                | integration-platform | load                                            |
| ------------------------------------- | --------------------- | -------------------------- | -------------------- | ----------------------------------------------- |
| Business package                      | business models       | one per use case, per side | no                   | no                                              |
| Published library or platform package | internals             | through the public API     | no                   | no                                              |
| App                                   | no (see exceptions)   | no                         | yes                  | once staging exists, if it has a server process |
| Plugin with code                      | yes                   | no                         | no                   | no                                              |
| Exempt project                        | no tests, no coverage |                            |                      |                                                 |

- **Apps with a server process:** today all five apps have one: investlab-api, qup-api and the three SSR webs (investlab, qup-web and green-beard). A static SPA would carry no load tests.
- **Exempt projects:** today `ts-configs`, `vitest-config` and the commander, expo-developer and prompt-presets plugins.
- **Dogfooding:** every published library has at least one consumer inside the monorepo, an app or another package. That consumer proves the packaged build, so no test imports a built output. Open gaps: react-clean (`agentic-task-08bl`) and http-client (`agentic-task-i0ti`).

### App unit-test exceptions

An app carries no unit tests; its logic, such as a form parser or a polling store, is tested through its integration-platform tests. The only exception is a piece so critical that its internal behaviour must be pinned down, and it is recorded here.

The list is empty.

## Harness

An integration-platform test enters an app through a harness.

- **Base harness, one per app.** It launches the app on its platform, arranges the fakes and hides the framework. It is the only test code that knows the app's framework and how the app is launched, so replacing the framework rewrites the base harness and no test.
- **One harness per entry point:** a route file for an API, a page for a UI. Its public methods are named after the domain (`givenItems`, `listItems`, `updateItem`) and return the `Response` or the DTO parsed with its zod schema. It holds no assertions.
- **Flat tests.** A test opens its harness with `await using api = await PortfolioItemsHarness.launch()`, then arranges, acts and asserts over harness methods with `expect`. One `describe` level at most; no `beforeEach` or `afterEach` manages a harness. The harness implements `Symbol.asyncDispose`, so the app closes when the scope ends, on failure too; `close()` is idempotent.
- **Test-data builders live in the owning package**, exported through its `./testing` subpath (`@m0n0lab/investlab-portfolio/testing`, `@m0n0lab/investlab-quotes/testing`) so every app's harness can reuse them, and excluded from coverage.

An API's base harness adds three rules:

- **Real composition root.** `launch()` calls the app's own `createContainer()`, binds `PLATFORM.Config` to constants and serves the app on `127.0.0.1:0` inside the test process. Tests talk to it over the standard `fetch`, so the Node adapter, real headers and streamed bodies run, coverage counts the server, and every test exercises the real module wiring.
- **Boundary guards.** `PLATFORM.Db`, `PLATFORM.Redis` and `PLATFORM.HttpClient` are rebound to guards that throw `system boundary reached: <port>` on first use. A use case the test forgot to arrange fails at once, naming the port, and nothing reaches Postgres or Redis.
- **Fakes record calls.** `fake(TOKEN)` rebinds a use case to a fake that returns the arranged result and records its calls. The response proves the route's output side; the recorded calls prove its input side, such as the id taken from the path and the body turned into the use-case input.

The living guide is `apps/investlab-api/src/testing/base-api-harness.ts` with `apps/investlab-api/src/routes/portfolio-items.routes.integration-platform.ts`. There is no separate harness document and no lint rule; new suites copy the reference suite and review corrects them. The UI harness follows the same rules; its concrete design is settled with the first UI integration-platform test (`agentic-task-3ao3`).

## Load tests are reserved

No load tests exist yet. The kind and its rules are recorded now so the first load test lands in the right shape.

- **One kind, five profiles.** A load test declares its profile: average load, stress, spike, soak or breakpoint.
- **Thresholds, not inspection.** It fails on a declared threshold, such as p95 latency or error rate.
- **Never in pull-request CI.** It runs scheduled or on demand against staging. Shared GitHub runners make a threshold fail at random.
- **Only unloadable third parties are faked.** Finnhub has a rate limit and terms of use, so load tests use a Finnhub fake. E2E keeps Finnhub real, because a small e2e suite fits the free tier and it is the only test that notices a contract change. That difference is why load is a kind of its own and not an e2e profile.
- **Rollout by risk.** qup-api comes first, with its opening-time burst and its SSE connections over an in-memory event bus.
- **Prerequisites:** staging with a seeded database, a Finnhub fake and the SLOs the thresholds come from (`agentic-task-8hmn`). The tool is chosen in `agentic-task-1qry`, blocked by staging, which holds the comparison of Artillery, k6 and Gatling JS.

Frontend performance budgets (web vitals, bundle size, requests per page) are single-user and deterministic; they are not load tests.

## Coverage and mutation

- **One coverage figure per project**, from all its non-e2e kinds together. `coverage.include` covers every source file, so an untested file counts as 0%; test files, type tests, `**/testing/**`, setup files and generated folders are excluded.
- **Thresholds** live in each `vitest.config.ts`, through a helper in `@m0n0lab/vitest-config` that enforces them only on the aggregate `test:coverage`; a `test:<kind>:coverage` run is informational. CI runs `test:coverage`, affected projects on pull requests and every project on pushes.
- **Target and floors.** The target is 80 for lines, branches, functions and statements. A project below it sets each metric to its measured value rounded down to a multiple of 5, or 0 when it has no tests. Floors are never lowered and rise when the measured value passes the next multiple of 5. Codecov's patch target is 80%.
- **Mutation.** Stryker runs over every non-e2e test of a project and never mutates a test file of any kind. Thresholds are high 90, low 80, break 80, with floors set the same way (qup-domain and solid-clean sit at 75). Pull requests gate the affected projects, using the incremental cache from `develop` without saving it; only pushes to `main` and `develop` upload to the Stryker dashboard. Projects with tests but no Stryker configuration are tracked in `agentic-task-0wd7`.

## Legacy tests

A test written under the strategy that predates this policy is renamed `*.legacy.test.{ts,tsx}`. It keeps running in the unit project until a test of the right kind covers its behaviour, then it is deleted. It is never a model for a new test.

`docs/legacy-tests.txt` lists every legacy file. The `lint:legacy-tests` check in CI fails when a legacy file appears that is not on the list, or a listed file no longer exists, so the set only shrinks.

| Group                                         | Files                                                                                   | Replaced by                                  | Issue               |
| --------------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------- |
| qup-domain use cases with mocked repositories | `packages/qup-domain/src/use-cases/*.use-case.legacy.test.ts` (11)                      | integration tests per use case               | `agentic-task-5xv8` |
| investlab web unit tests                      | `apps/investlab/app/**/*.legacy.test.{ts,tsx}` (9)                                      | integration-platform tests on a UI harness   | `agentic-task-3ao3` |
| qup-api unit tests                            | `apps/qup-api/src/**/*.legacy.test.ts` (3)                                              | integration-platform tests on an API harness | `agentic-task-rhex` |
| DTO, mapper and batch tests                   | investlab-portfolio (5), investlab-quotes (2) and investlab-core (1) `*.legacy.test.ts` | use-case integration tests                   | `agentic-task-82ja` |

## Considered options

- Only a spec, no ADR: rejected; agents read `AGENTS.md`, and the reasons behind the policy belong in an ADR.
- The full category matrix in `AGENTS.md`: rejected; it inflates a file every agent loads with what this ADR holds. `AGENTS.md` carries one line pointing here.
- Unit tests for app logic: rejected; they pin internals the integration-platform tests already run.
- Driving an API with Hono's `app.request()`, as before: rejected; the framework's API ends up in every test file. `app.fetch(new Request())` is standard but only frameworks with a fetch handler offer it, and nothing crosses a socket.
- supertest, light-my-request or pactum: rejected; Node-only or their own DSL, for nothing `fetch` lacks.
- Hurl, Bruno or Playwright's `request` for integration-platform tests: rejected; a black box in another process allows no per-test fakes and no coverage. They fit e2e.
- A hand-built container of fakes: rejected; it tests a wiring production never runs.
- A "not arranged" fake per use-case token instead of boundary guards: rejected; a better message, but a list that must grow with every use case.
- Closing the harness with `onTestFinished` inside `launch()`, the fleet's variant, or with `test.extend` fixtures: rejected; both tie the harness to Vitest and hide the resource's lifetime.
- A lint rule forbidding framework imports in tests: rejected; the reference suite and review hold the pattern.
- Coverage thresholds as CLI flags on every per-kind script, or only in CI: rejected; about 30 scripts to keep in step, or a local `test:coverage` that differs from CI.
- Load tests in pull-request CI, or load as an e2e profile: rejected; runner noise fails pull requests at random, and the two kinds fake different things.

## Consequences

- Every test lands in a named kind, and a project that adds a kind is tested by `test` and CI with no pipeline edit.
- Integration tests still need a Docker-compatible daemon locally and in CI, as in ADR 0006. The QUP mocked-repository tests that ADR 0006 left in place are now legacy (`agentic-task-5xv8`).
- Coverage and mutation floors stop regressions from today's level and ratchet towards 80.
- The mutation gate lengthens pull-request CI; incremental mode limits it to mutants in changed code.
- E2E and load tests wait for staging.
- The harness pattern follows the fleet convention (beads `WebstormProjects-tdhc.13`) with two monolab variants posted back to it: APIs are driven over real HTTP, and the lifecycle uses `await using`.
