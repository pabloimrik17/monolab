# Proposal

## Why

The monorepo has no written test policy, so every project tests differently and agents copy whichever neighbour they find. "Integration" means four things: use cases against real Postgres and Redis, a library against a real Postgres, the built package, and React components in a browser. App tests run against in-memory repositories. `qup-domain` tests its use cases against mocked repositories. No project has a coverage threshold, and Vitest 4 counts only the files a test loads: qup-api reports 96% while its honest figure is 9.5%. Mutation testing runs only after merge, and its dashboard has never received a report. The experiments plugin's tests never run in CI.

## What Changes

- **Test policy.** Write the fewest tests that run the most real code. There are five kinds of test, plus type tests for libraries:
    - **unit**: business models and library internals, in isolation;
    - **integration**: a use case or a library's public API run for real down to the system boundary, faking only what lies beyond it (MSW for HTTP APIs, Testcontainers for databases and caches);
    - **integration-platform**: an app run for real on its platform (UI in a browser, or a request to its API) with the use cases faked;
    - **e2e**: staging driven from the outermost edge, nothing faked, third-party APIs included. Reserved; none exist yet;
    - **load**: staging driven under a declared profile (average-load, stress, spike, soak, breakpoint), failing on a threshold, never in PR CI, faking only the third-party APIs it may not load. Reserved; none exist yet, and the tool is chosen when staging exists.
- **What each project category tests.** Business package: unit for models and integration per use case. App: integration-platform, never unit; load too, once staging exists, if it has a server process (today all five apps do). Library (published or platform): unit for internals and integration through its public API. Plugin with code: unit. Exempt projects (prompts or config only) carry no tests. Every published library has at least one consumer inside the repo (dogfooding).
- **Harness.** Integration-platform tests enter an app through a harness: a base harness per app that launches the app and arranges the fakes, one harness per entry point (route file or page) with domain-named methods, assertions in the test, `await using` for the lifecycle, no `beforeEach`/`afterEach`. The harness is the only test code that knows the framework. For an API, the base harness launches the real composition root on an ephemeral port in the test process, rebinds use cases to fakes that record their calls, binds config to constants and guards the platform ports (database, cache, HTTP client) so an unarranged use case fails at once; tests talk to it over plain `fetch`.
- **One naming scheme:** file suffix, Vitest project and script share one token per kind (`*.test.ts` → `unit`, `*.integration.ts` → `integration`, `*.integration-platform.ts` → `integration-platform`, `*.test-d.ts` → `types`). `test` runs every kind. `test:<kind>` filters it, and each filter has the aggregate's variants (`:watch`, `:coverage`, `:changed`). **BREAKING** for scripts: `test:browser*` is removed and the `*.browser.test.*` suffix disappears; the browser is a test environment, not a kind.
- **Coverage.** One figure per project, unit and integration combined. `coverage.include` covers every source file, so untested files count as 0%. Thresholds live in each `vitest.config.ts` and are enforced only on the aggregate `test:coverage`, which CI runs. The target is 80% on lines, branches, functions and statements; a project below it gets its current figure rounded down to a multiple of 5 as a floor, and floors only go up. The Codecov patch target rises from 50% to 80%.
- **Mutation.** Stryker runs over every non-e2e test of a project. It gates pull requests on affected projects using the incremental cache from `develop`. The target `break` is 80, with floors set the same way as coverage. The dashboard reporter is switched on, so the README badges work again.
- **Legacy tests** follow the old strategy and are renamed `*.legacy.test.*`. They are listed in ADR 0008 with one tracker issue per group, and a CI check fails if a new one appears. Affected: `qup-domain` use-case tests with mocked repositories; the unit tests of apps/investlab and apps/qup-api; and DTO, mapper and batch tests in business packages.
- **Removed:**
    - apps/demo;
    - http-client's built-package test and its `build` dependencies;
    - investlab-api unit tests now covered by its integration-platform tests, its container test included (the harness launches the real composition root), and its in-memory repositories;
    - the broken root `mutation:test` script;
    - the `ts-configs` Codecov flag (exempt project).
- **Modified:**
    - investlab-api route tests move onto a harness over the real composition root with faked use cases and are renamed to `*.integration-platform.ts`;
    - investlab-portfolio and investlab-quotes gain a `./testing` subpath with the test-data builders the harnesses use;
    - ts-configs adds `ESNext.Disposable` to its `lib` for `await using`;
    - investlab-platform's MSW tests become integration tests;
    - the react-clean and react-hooks browser tests become integration tests;
    - drizzle-neverthrow's integration test imports the public entry;
    - the experiments plugin joins CI and Codecov;
    - the root Vitest config covers apps and plugins.
- **Documentation:**
    - ADR 0008 (the policy, amending ADR 0006);
    - a single line in `AGENTS.md` pointing to it;
    - the Workspace glossary (`docs/GLOSSARY.md`), already written.
- **Out of this change:**
    - staging, the load-test tool and the first load tests (tracked as issues; the tool comparison lives in its issue);
    - the UI harness design (settled with the first UI integration-platform test);
    - frontend performance budgets (web vitals, bundle size, requests per page): a single-user, deterministic concern, not a kind of load test;
    - running tests from package sources (measured separately);
    - fixing the dogfooding gaps (react-clean and http-client have no in-repo consumer; tracked as issues).

## Capabilities

### New Capabilities

- `test-policy`: which kinds of test exist, what each project category must test, how integration-platform tests reach an app through a harness, how test files, Vitest projects and scripts are named, how legacy tests are marked, and how coverage and mutation thresholds are set and enforced.

### Modified Capabilities

- `vitest-testing`: every requirement is removed. They describe sharding, `vitest.workspace.ts`, per-type thresholds and browser-named tests that no longer exist; `test-policy` replaces them.
- `mutation-testing`: CI runs mutation on pull requests too, thresholds follow the policy's target and floors, and the dashboard receives reports. The capability currently lives in the unarchived `add-mutation-testing` change, which is archived first.
- `pr-coverage-checks`: the patch coverage check requires 80%.
- `coverage-reporting`: coverage uploads follow the projects tested by `test:coverage` instead of `test:unit`.
- `test-analytics`: JUnit results come from the aggregate `test:coverage` run.
- `codecov-config`: one flag per project that has tests, none for exempt projects.

## Impact

- **Test files:** about 50 files renamed or moved (legacy, integration-platform, integration), about 9 deleted, and the investlab-api harness written from scratch (base harness plus one per route file).
- **Config:**
    - every `vitest.config.ts` (projects, `coverage.include`, thresholds) and the root `vitest.config.ts`;
    - `packages/ts-configs` base tsconfigs (`lib` gains `ESNext.Disposable`);
    - investlab-portfolio and investlab-quotes `package.json` (`./testing` export; both private, no attw);
    - every project `package.json` test script;
    - root `package.json` scripts;
    - `stryker.config.base.mjs` and the per-package Stryker configs;
    - `codecov.yaml`;
    - `.github/workflows/ci.yml`, which runs `test:coverage` and gates mutation on PRs.
- **Removed project:** apps/demo. Its codecov-plugin note moves to the configs that cite it.
- **Docs:** `docs/adr/0008-test-policy.md`, `docs/adr/0006` (status: amended), `AGENTS.md`, `docs/GLOSSARY.md`, `GLOSSARY-MAP.md`.
- **Tracker:** issues for each legacy group, the two dogfooding gaps, the source-condition measurement, staging, and the load-test tool choice (blocked by staging, holding the Artillery/k6/Gatling comparison).
- **Stack:** sits on top of `ci-nx-cache` in the same PR stack.
- **Packaging:** no published package changes its exports; no attw validation needed.
