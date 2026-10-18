# Tasks

## 1. OpenSpec groundwork

- [ ] 1.1 Archive `add-mutation-testing` so the `mutation-testing` spec exists (its open tasks are all dashboard work this change completes); verify that `openspec/specs/mutation-testing/spec.md` exists and that `openspec validate define-test-policy --strict` no longer reports that archive would refuse the `mutation-testing` delta

## 2. Policy documents

- [ ] 2.1 Write `docs/adr/0008-test-policy.md`:
    - the decision and its reasons, the five kinds plus type tests, and the category matrix (apps with a server process also carry load tests once staging exists);
    - the app-unit exception list (empty);
    - the harness pattern: base harness per app, one harness per entry point, `await using`, assertions in the test; for APIs the real composition root, boundary guards and fakes that record calls; `apps/investlab-api/src/testing/base-api-harness.ts` and `portfolio-items.routes.integration-platform.ts` named as the living guide, no separate harness doc;
    - the reserved load kind: profiles, thresholds, never in PR CI, third-party APIs faked, its prerequisites (staging with a seeded database, a Finnhub fake, SLOs) and the issue holding the tool comparison (from 9.1); one line stating that frontend performance budgets are not load tests;
    - the legacy groups with their issue IDs (filled in by 9.1);
    - that it amends ADR 0006.

    Verify with `pnpm nx run @m0n0lab/source:lint:markdownlint`.
- [ ] 2.2 Set ADR 0006's frontmatter status to `amended by ADR-0007, ADR-0008`; verify that the file renders and passes markdownlint
- [ ] 2.3 Add to `AGENTS.md` exactly the owner-approved line `Write the fewest tests that run the most real code. Full policy: [ADR 0008](docs/adr/0008-test-policy.md).` and nothing else; verify with `git diff AGENTS.md`, which should show one added line
- [ ] 2.4 Check that `docs/GLOSSARY.md` (Workspace context, written during the grills; includes Harness, Load test and Staging) and its `GLOSSARY-MAP.md` entry pass markdownlint and match the terms used in ADR 0008

## 3. Shared tooling

- [ ] 3.1 Add the coverage-threshold helper to `@m0n0lab/vitest-config`. It returns the given thresholds, or none when the Vitest run is filtered with `--project`. Verify with `pnpm nx run @m0n0lab/vitest-config:build` and with 4.2's filtered and full runs.
- [ ] 3.2 Update `stryker.config.base.mjs`:
    - thresholds `{ high: 90, low: 80, break: 80 }`;
    - add `!src/**/*.integration-platform.ts` and `!src/**/*.integration-platform.tsx` to `mutate`;
    - add the `dashboard` reporter only when `STRYKER_DASHBOARD_API_KEY` is set.

    Verify with `pnpm nx run @m0n0lab/ts-types:test:mutation` (score 100, no dashboard upload without the key).
- [ ] 3.3 Add `docs/legacy-tests.txt` (empty for now) and the root script `lint:legacy-tests` (`git ls-files '*.legacy.test.*' | diff docs/legacy-tests.txt -`). Add it to root `nx.includedScripts`, with its Nx metadata in the root `project.json`. Verify that `pnpm nx run @m0n0lab/source:lint:legacy-tests` passes, and fails after a temporary `touch x.legacy.test.ts && git add x.legacy.test.ts`; undo the temporary file.
- [ ] 3.4 ts-configs: add `ESNext.Disposable` to `lib` in `tsconfig.base.json` and `tsconfig.web.base.json` so `Symbol.asyncDispose` and `await using` type-check. Verify with `pnpm nx run-many -t typecheck`.

## 4. Libraries

- [ ] 4.1 http-client: delete `src/package-entry.integration.ts`, its `integration` Vitest project, its `test:integration*` scripts and the `build` entries in `project.json`'s test targets. Verify that `pnpm nx run @m0n0lab/http-client:test:coverage` passes and that `pnpm nx show project @m0n0lab/http-client --json` lists no `test:integration` target.
- [ ] 4.2 For every library (drizzle-neverthrow, http-client, react-clean, react-hooks, solid-clean, ts-types, investlab-platform), set `coverage.include` and `coverage.exclude` per design.md, and thresholds through the helper. Verify that `pnpm nx run-many -t test:coverage -p <libraries>` passes and that `pnpm nx run @m0n0lab/react-hooks:test:unit:coverage` passes without enforcing thresholds.
- [ ] 4.3 react-clean and react-hooks:
    - `git mv` the `*.browser.test.tsx` files to `*.integration.tsx`;
    - delete every `test:browser*` script;
    - add the missing per-kind variants (`:changed`, `:coverage`).

    Verify with `pnpm nx run-many -t test:integration -p @m0n0lab/react-clean @m0n0lab/react-hooks` (runs in headless Chromium) and `git grep -n "browser.test\|test:browser"`, which should return nothing outside `openspec/changes/archive`.
- [ ] 4.4 drizzle-neverthrow: import `./index.ts` in `wrap.integration.ts`; verify that `pnpm nx run @m0n0lab/drizzle-neverthrow:test:integration` passes in CI
- [ ] 4.5 investlab-platform: `git mv` `src/client/investlab-api-client.test.ts` and `src/shared/http-client.test.ts` to `*.integration.ts`, add `unit` and `integration` Vitest projects and the per-kind scripts. Verify that `pnpm nx run @m0n0lab/investlab-platform:test:integration` runs exactly those two files.
- [ ] 4.6 Drop the per-package Stryker `thresholds` overrides in drizzle-neverthrow, http-client, react-clean, react-hooks and ts-types, and set `low: 75, break: 75` in solid-clean; verify that `pnpm nx run-many -t test:mutation -p <those packages> --parallel=1` passes
- [ ] 4.7 ts-configs: delete its unused `vitest.config.ts`; verify that `pnpm nx show project @m0n0lab/ts-configs --json` lists no test target

## 5. Business packages

- [ ] 5.1 investlab-portfolio and investlab-quotes: rename the Vitest projects `integration-server`/`integration-client` to `integration:server`/`integration:client` and update `test:integration*` scripts; verify that `pnpm nx run @m0n0lab/investlab-portfolio:test:integration` still runs all 16 integration files in CI
- [ ] 5.2 `git mv` to `*.legacy.test.ts`:
    - investlab-portfolio's `data/contracts/*.dto.test.ts` and `data/server/*.mapper.test.ts`;
    - investlab-quotes' `quote.dto.test.ts` and `batch.test.ts`;
    - investlab-core's `api-error.dto.test.ts`;
    - qup-domain's 11 `use-cases/*.use-case.test.ts`.

    Append the paths to `docs/legacy-tests.txt` and keep it sorted. Verify that `pnpm nx run @m0n0lab/source:lint:legacy-tests` passes and that `pnpm nx run-many -t test:unit -p <those packages>` runs the same number of tests as before.
- [ ] 5.3 Set `coverage.include`/`exclude`, thresholds and the aggregate and per-kind scripts for investlab-core, investlab-portfolio, investlab-quotes, qup-domain, qup-data and qup-shared. Set qup-domain's Stryker override to `low: 75, break: 75`. Verify that `pnpm nx run-many -t test:coverage` passes for the non-Docker packages locally and for all of them in CI.
- [ ] 5.4 investlab-portfolio and investlab-quotes: add `src/testing/` with the test-data builders moved from investlab-api's `in-memory-portfolio.ts` (`makeInstrument`, a portfolio item builder, a quote builder) and export it through a `./testing` subpath in `package.json` (both private, no attw). Add `**/testing/**` to their `coverage.exclude`. Verify with `pnpm nx run-many -t typecheck -p @m0n0lab/investlab-portfolio @m0n0lab/investlab-quotes` and that `test:coverage` lists no `testing/` file.

## 6. Apps

- [ ] 6.1 investlab-api harness (design.md, "How integration-platform tests reach an API"):
    - write `src/testing/base-api-harness.ts`: `launch()` calls the real `createContainer()`, rebinds `PLATFORM.Config` to constants and `PLATFORM.Db`, `PLATFORM.Redis`, `PLATFORM.HttpClient` to guards that throw `system boundary reached: <port>`, starts the app with `@hono/node-server` on `127.0.0.1:0` and returns the URL; `fake(TOKEN)` rebinds a use case to a fake that returns an arranged result and records `calls`; `[Symbol.asyncDispose]` and an idempotent `close()`; protected `request`/`json` adding the bearer token. It is the only test file importing `hono`, `@hono/node-server` or `inversify`;
    - write one harness per route file (`src/routes/portfolio-items.harness.ts`, `instruments.harness.ts`, `quotes.harness.ts`) with domain-named methods that return the `Response` or the DTO parsed with its zod schema, no `expect` inside;
    - `git mv` the three route tests to `*.routes.integration-platform.ts` and rewrite them flat: `await using api = await <Harness>.launch()`, Arrange/Act/Assert, one `describe` level at most, no `beforeEach`/`afterEach`; success cases assert status, body and the fake's `calls`, error cases assert the mapped status and body;
    - delete `src/testing/test-app.ts` and `src/testing/in-memory-portfolio.ts` (builders moved in 5.4).

    Verify with `pnpm nx run @m0n0lab/investlab-api:test:integration-platform`, and that a test which deliberately skips `fake()` fails naming `PLATFORM.Db` without any Docker running.
- [ ] 6.2 investlab-api: move `app.test.ts`'s `/health`, missing-token and unknown-route cases into `src/app.integration-platform.ts` on `BaseApiHarness` and delete `app.test.ts`. Verify that the new file passes and that the dropped cases only wrapped `handleError` in a standalone Hono.
- [ ] 6.3 investlab-api: compare coverage of `errors/error-mapping.ts`, `middleware/bearer-auth.ts` and `serializers/dto-serializers.ts` between the old unit run and the new integration-platform run. Delete the three unit tests only when the new run covers each file at least as well, and add the missing route assertions first if not. Verify by attaching both coverage summaries to the PR.
- [ ] 6.4 investlab-api: delete `src/container.test.ts` (every integration-platform test now launches the real `createContainer()`). Define a single `integration-platform` Vitest project with its scripts (`test:integration-platform`, `:watch`, `:coverage`, `:changed`); no `unit` project, since no unit test remains. Verify that `pnpm nx run @m0n0lab/investlab-api:test` runs only that project and that `git grep -n "container.test" apps/investlab-api` returns nothing.
- [ ] 6.5 investlab web and qup-api: `git mv` all their `*.test.ts(x)` to `*.legacy.test.ts(x)` and add them to `docs/legacy-tests.txt`; verify that `pnpm nx run-many -t test -p @m0n0lab/investlab @m0n0lab/qup-api` passes with the same test count
- [ ] 6.6 Set `coverage.include`/`exclude` and thresholds for investlab, investlab-api, qup-api, qup-web and green-beard (TypeScript sources only for green-beard; `.svelte` files cannot be parsed by v8 coverage there). Verify that `pnpm nx run-many -t test:coverage -p <apps>` passes.
- [ ] 6.7 Delete `apps/demo`, the root `demo:dev` script and its lockfile entries (`pnpm install`). Move its codecov-plugin cast note into `apps/investlab/vite.config.ts` and point `apps/green-beard/vite.config.ts` at it. Verify that `git grep -n "apps/demo\|@m0n0lab/demo"` returns nothing outside `openspec/` and that `pnpm nx run-many -t build` passes.

## 7. Plugin with code

- [ ] 7.1 experiments plugin: add `test:watch`, `test:coverage`, `test:changed` and the `test:unit` variants, plus `coverage.include` (`scripts/**/*.mjs`) and thresholds. Verify that `pnpm nx run @m0n0lab/plugin-experiments:test:coverage` passes and that `nx show projects --with-target test:coverage` lists it.

## 8. Root and CI wiring

- [ ] 8.1 Root `package.json`:
    - rename `mutation:test*` to `test:mutation*`;
    - delete `test:browser*`;
    - add `test:integration-platform`, `test:integration-platform:affected` and `test:integration-platform:watch`;
    - make `investlab:test` and `qup:test` run `-t test` over their apps and packages.

    Verify that each renamed or added script resolves to existing targets (`pnpm run test:mutation:affected --dry-run` or a run with `--skip-nx-cache` on one project).
- [ ] 8.2 Root `vitest.config.ts`: list `{apps,packages}/*/vitest.config.ts` and `claude-plugins/*/vitest.config.mjs`; verify that `pnpm run test:ui` opens with apps and the experiments plugin present
- [ ] 8.3 `codecov.yaml`: remove the `ts-configs` flag and statuses, add `plugin-experiments` (path `claude-plugins/experiments/`), and set every patch target to 80% with threshold 0. Verify with `curl --data-binary @codecov.yaml https://codecov.io/validate`.
- [ ] 8.4 `.github/workflows/ci.yml` tests job:
    - run `test:coverage` (affected on PR, run-many on push) in place of `test:unit:coverage`, `test:integration` and `test:types`;
    - drop `ts-configs` from the Codecov matrix and add `plugin-experiments:claude-plugins/experiments`.

    Verify on the PR run that the tests job executes every project's aggregate and that `upload-codecov` has a matrix entry for `plugin-experiments`.
- [ ] 8.5 `.github/workflows/ci.yml`:
    - the build job runs `test:mutation` with `--parallel=1` on pull requests (affected) as well as pushes;
    - `STRYKER_DASHBOARD_API_KEY` is passed on push only;
    - the Stryker cache is saved on push only;
    - the lint job runs `lint:legacy-tests`.

    Verify on the PR run that mutation ran for the affected Stryker packages and uploaded nothing to the dashboard.

## 9. Thresholds and tracking

- [ ] 9.1 Create the tracker issues through the labelling skill:
    - one per legacy group (qup-domain use cases; investlab web; qup-api; DTO, mapper and batch tests in investlab packages);
    - one per dogfooding gap (react-clean, http-client);
    - the `@m0n0lab/source` test-resolution measurement;
    - Stryker for the projects with tests that lack it;
    - staging (a deployment with a seeded database and a Finnhub fake; prerequisite of e2e and load);
    - the load-test tool choice, blocked by the staging issue, with the design.md candidate comparison (Artillery, k6, Gatling JS) in its description.

    Write the legacy and load-tool issue IDs into ADR 0008, and verify that each issue ID in the ADR resolves with `bd show`.
- [ ] 9.2 From the PR's CI coverage run, set the thresholds of investlab-portfolio, investlab-quotes, investlab-api and the experiments plugin, and recheck the provisional floors of every other project against the measured values, using the spec rule (80, or measured rounded down to a multiple of 5). Verify that the next CI run's `test:coverage` passes on all projects.

## 10. Final checks

- [ ] 10.1 Run `pnpm nx run-many -t lint test:coverage typecheck` and `pnpm run lint:fallow` locally (Docker-backed integration in CI), and confirm on the PR that every job and the `main` gate are green
- [ ] 10.2 Run `openspec validate define-test-policy --strict` and confirm it passes without the archive warning

## Workflow follow-up

- This change stacks on `ci-nx-cache` in the same PR stack and merges after it.
- The UI harness is designed with the first UI integration-platform test, in its own change.
- Archive after merge; a possible third proposal migrates the investlab web's hand-written view model to react-clean, which would also close react-clean's dogfooding gap.
