## ADDED Requirements

### Requirement: Deploys initiated only from GitHub Actions

`qup-web` and `qup-api` SHALL only be deployed by a GitHub Actions workflow. The Cloudflare Pages/Workers Git integration MUST NOT be connected to the repository on the Cloudflare side.

#### Scenario: No CF-side Git connection exists

- **WHEN** the Cloudflare dashboard is inspected
- **THEN** neither the `qup-web` Pages project nor the `qup-api` Worker shows a connected Git repository
- **AND** deploys cannot be triggered by `git push` reaching Cloudflare directly

#### Scenario: Manual local deploy is allowed but not the default

- **WHEN** a developer runs `sst deploy --stage dev` from a local machine
- **THEN** the deploy succeeds (this path is allowed for bootstrap and emergency fixes)
- **AND** the developer is expected to record manual deploys in the change/incident log

### Requirement: Branch-to-stage mapping

A push to the `develop` branch SHALL deploy to the `dev` stage. A push to the `main` branch SHALL deploy to the `prod` stage. No other branches SHALL trigger a deploy.

#### Scenario: Merge to develop produces a dev deploy

- **WHEN** a PR is merged into `develop` and the resulting workflow run finishes
- **THEN** the dev Worker and dev Pages deployment reflect the new commit
- **AND** the prod stage is untouched

#### Scenario: Merge to main produces a prod deploy

- **WHEN** a PR is merged into `main` and the resulting workflow run finishes
- **THEN** the prod Worker and prod Pages deployment reflect the new commit
- **AND** the dev stage is untouched

#### Scenario: Pushes to other branches do not deploy

- **WHEN** a commit is pushed to any branch other than `develop` or `main`
- **THEN** no deploy job runs
- **AND** no Cloudflare or Neon resource is mutated by CI

### Requirement: Deploys gated on CI green

The deploy job SHALL only run if every preceding CI job (lint, typecheck, unit tests, build) for that workflow run completes successfully. A single failing required job MUST prevent the deploy.

#### Scenario: A failing test blocks deploy

- **WHEN** the test job fails on a `develop` push
- **THEN** the deploy job is not scheduled
- **AND** the dev stage retains the previously deployed commit

#### Scenario: A failing lint blocks deploy

- **WHEN** the lint job fails on a `main` push
- **THEN** the deploy job is not scheduled
- **AND** the prod stage retains the previously deployed commit

#### Scenario: All gates green ⇒ deploy runs

- **WHEN** every required CI job is green on the workflow run for a `develop` or `main` push
- **THEN** the deploy job executes `sst deploy --stage <env>` for the matching stage

### Requirement: Stage-specific secrets and Neon branch binding

The deploy job SHALL inject only the secrets and `DATABASE_URL` belonging to the target stage. Cross-stage secret leakage MUST be impossible by construction.

#### Scenario: Dev deploy uses dev secrets and dev Neon branch

- **WHEN** the deploy job runs for stage `dev`
- **THEN** the Worker is bound to the connection string of the `develop` Neon branch
- **AND** only secrets scoped to the `dev` GitHub environment are exposed to the job

#### Scenario: Prod deploy uses prod secrets and main Neon branch

- **WHEN** the deploy job runs for stage `prod`
- **THEN** the Worker is bound to the connection string of the `main` Neon branch
- **AND** only secrets scoped to the `prod` GitHub environment are exposed to the job

### Requirement: Failed deploys do not partially mutate prod

A deploy that fails mid-execution SHALL NOT leave the prod stage in a partially updated state. If the deploy cannot complete, the previously deployed version MUST continue serving traffic.

#### Scenario: Failed Worker deploy keeps previous Worker live

- **WHEN** `sst deploy --stage prod` fails after the Pages deploy succeeds but before the Worker deploy completes
- **THEN** the previous Worker version continues to serve traffic for `qup-api`
- **AND** the failure is surfaced in the workflow run as a red status

#### Scenario: Rollback via revert is supported

- **WHEN** a bad commit is deployed to prod
- **THEN** reverting the commit on `main` and letting CI run produces a clean redeploy to the previous good state
