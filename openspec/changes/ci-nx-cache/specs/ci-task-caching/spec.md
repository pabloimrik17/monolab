# Spec Delta

## Purpose

Defines how CI runs and developer machines reuse Nx task results, so unchanged work is never repeated, including after the Nx Cloud monthly quota runs out.

## ADDED Requirements

### Requirement: Deterministic targets are cacheable

Every Nx target whose result depends only on its declared inputs SHALL be cacheable, with inputs that include everything it reads and outputs that include everything it writes. The targets that depend on git state, run continuously, are interactive, touch a database or analyse the whole repository SHALL stay uncached.

#### Scenario: Cached targets

- **WHEN** `NX_DAEMON=false pnpm nx show project <name> --json` is run for any project
- **THEN** its `build`, `build:check-exports`, `typecheck` and `lint:*` targets, except `lint:fallow`, have `cache: true`
- **AND** every `test` or `test:*` target has `cache: true`, except `*:changed`, `*:watch`, `test:ui` and `test:mutation:report`

#### Scenario: Deliberately uncached targets

- **WHEN** the same command is run
- **THEN** `*:changed`, `*:watch`, `test:ui`, `db:*`, `dev`, `test:mutation:report` and `lint:fallow` targets have no `cache: true`

#### Scenario: Second run is served from cache

- **WHEN** `pnpm nx run-many -t typecheck test:unit` runs twice with no file changed between the runs
- **THEN** the second run reports every task as read from cache

### Requirement: Typecheck uses the inferred target where the command matches

A project whose typecheck command is the one the `@nx/js/typescript` plugin infers SHALL NOT declare its own `typecheck` script, so the inferred, cached target applies. A project that needs extra steps SHALL keep its script and declare cache, inputs and outputs in its `project.json`.

#### Scenario: Plain TypeScript project

- **WHEN** a project's typecheck is `tsc --build tsconfig.json --emitDeclarationOnly`
- **THEN** its `package.json` has no `typecheck` script
- **AND** its resolved `typecheck` target has the `@nx/js/typescript` command, inputs and outputs

#### Scenario: Project with extra typecheck steps

- **WHEN** a project's typecheck also generates types first, as `apps/investlab` does with `react-router typegen`
- **THEN** its `package.json` keeps the `typecheck` script
- **AND** its `project.json` declares `cache: true`, inputs and outputs for that target

### Requirement: Nx Cloud serves as remote cache only

CI SHALL use Nx Cloud as a remote task cache and SHALL NOT distribute tasks to Nx Cloud agents. Every task runs on the GitHub runner that requests it.

#### Scenario: CI run with quota available

- **WHEN** CI runs while the Nx Cloud workspace is enabled
- **THEN** tasks read and write the Nx Cloud remote cache
- **AND** no `nx-cloud start-ci-run` step runs and no agent is requested

#### Scenario: CI run with quota exhausted

- **WHEN** CI runs while the Nx Cloud workspace is disabled for exceeding its plan
- **THEN** every task still runs and the run's result does not depend on Nx Cloud

#### Scenario: Developer machine

- **WHEN** a developer has run `nx login` once on their machine and the workspace is enabled
- **THEN** their local Nx commands read and write the same remote cache as CI

### Requirement: GitHub Actions keeps the local Nx cache

Every CI job that runs Nx tasks SHALL restore the `.nx` directory from the GitHub Actions cache before its first Nx command and save it after its last one, whatever the state of Nx Cloud. The cache key SHALL change per commit and per job, so every run can save.

#### Scenario: Restore on a branch with no cache yet

- **WHEN** the first CI run of a new branch starts a job
- **THEN** the job restores the most recent `.nx` cache saved by the same job on `develop`

#### Scenario: Save after every run

- **WHEN** a job finishes, with or without failed tasks
- **THEN** it saves its `.nx` directory under a key that includes the job name and the commit SHA

#### Scenario: Quota exhausted

- **WHEN** Nx Cloud is disabled and a run touches only one project
- **THEN** the tasks of untouched projects are read from the restored `.nx` cache instead of executed

### Requirement: Anonymous access to the remote cache is closed

The Nx Cloud workspace SHALL deny cache access to requests without a token, because the repository is public and the Nx Cloud default lets anyone read and write the cache.

#### Scenario: Request without a token

- **WHEN** a clone of the repository runs Nx tasks without `NX_CLOUD_ACCESS_TOKEN` and without `nx login`
- **THEN** Nx Cloud neither serves nor stores cache entries for it
