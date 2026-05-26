## ADDED Requirements

### Requirement: Frontend hosting on Cloudflare Pages

The `qup-web` app SHALL be hosted on Cloudflare Pages and built with the SolidStart `cloudflare-pages` Nitro preset.

#### Scenario: Production build produces Cloudflare Pages output

- **WHEN** `nx run @m0n0lab/qup-web:build` runs with the cloudflare-pages preset configured
- **THEN** the build emits a `.output/` directory matching the Cloudflare Pages Functions layout (`_worker.js` or `functions/`)
- **AND** no Node-runtime artifacts (e.g., a Node server entrypoint) are present in the output

#### Scenario: Deployed Pages project serves SSR routes

- **WHEN** a request reaches the deployed `qup-web` Pages URL
- **THEN** the Pages Function handles the request on the Workers runtime
- **AND** SolidStart server functions execute without invoking any Node-only API

### Requirement: API hosting on Cloudflare Workers

The `qup-api` app SHALL be hosted on Cloudflare Workers as a module Worker with Hono's native `fetch` handler. The `@hono/node-server` adapter MUST NOT be present in the Workers build.

#### Scenario: Workers entrypoint exports Hono fetch

- **WHEN** the deployed Worker receives an HTTP request
- **THEN** the default export's `fetch` method is invoked with the Workers `Request`/`Env`/`ExecutionContext` triple
- **AND** the request is routed through the existing Hono app without Node-specific shims

#### Scenario: Local dev unchanged

- **WHEN** a developer runs `nx run @m0n0lab/qup-api:dev` locally
- **THEN** the API runs via `tsx watch` against the local Docker Postgres
- **AND** no Cloudflare credentials are required for the inner dev loop

### Requirement: Postgres on Neon with WebSocket driver in deployed runtime

The deployed `qup-api` Worker SHALL connect to Neon Postgres via the `@neondatabase/serverless` WebSocket driver bound to `drizzle-orm/neon-serverless`. The `pg` TCP driver MUST NOT be loaded inside Worker code. Multi-statement transactions MUST be supported in the deployed runtime.

#### Scenario: Worker uses WebSocket driver and supports transactions

- **WHEN** the deployed Worker executes `db.transaction(async (tx) => { ... })`
- **THEN** the transaction runs atomically over a single Neon WebSocket session
- **AND** no TCP socket is opened from the Worker
- **AND** committing or rolling back behaves identically to the local `node-postgres` path

#### Scenario: Local runtime keeps node-postgres path

- **WHEN** the API runs locally (non-Worker runtime)
- **THEN** the Drizzle client is constructed with `drizzle-orm/node-postgres` against the Docker Postgres
- **AND** the runtime selection is centralised behind a single `createDb()` factory in the data layer
- **AND** repositories type their database argument as the shared `PgDatabase` base type so they accept either driver without modification

### Requirement: Two persistent environments per stage

The hosting topology SHALL expose exactly two long-lived environments, `dev` and `prod`. Each environment SHALL have an isolated Worker, isolated Pages deployment, isolated Neon branch, and isolated secret set.

#### Scenario: Dev and prod resources are physically distinct

- **WHEN** both environments are deployed
- **THEN** there exist two Workers named `qup-api-dev` and `qup-api-prod` (or stage-suffixed equivalents)
- **AND** two Cloudflare Pages production deployments — one per stage
- **AND** two Neon branches — `develop` (for dev) and `main` (for prod)
- **AND** secrets bound to each Worker are sourced from the matching stage's secret set

#### Scenario: A dev outage cannot impact prod

- **WHEN** the `dev` stage is unhealthy or under heavy use
- **THEN** the `prod` stage remains independently reachable
- **AND** no shared resource (Worker, Pages deployment, Neon branch, secret) is consumed across stages

### Requirement: Infrastructure declared via SST v3 with Pulumi-Neon escape hatch

All hosting resources (Cloudflare Workers, Cloudflare Pages, Neon project, Neon branches, secrets) SHALL be declared in a single `sst.config.ts` at the repo root. Cloudflare resources SHALL use SST components; Neon resources SHALL use the `@pulumiverse/neon` Pulumi provider invoked from within the SST `run()` function.

#### Scenario: A fresh checkout can recreate the stack from IaC

- **WHEN** a contributor clones the repo, configures CF + Neon + Pulumi credentials, and runs `sst deploy --stage dev`
- **THEN** all dev-stage resources are created from `sst.config.ts` without any dashboard click-ops
- **AND** running `sst deploy --stage dev` a second time produces no resource drift

#### Scenario: No dashboard-managed resources

- **WHEN** any hosting resource is modified
- **THEN** the modification is expressed as a code change to `sst.config.ts` (or the Pulumi-Neon module it imports)
- **AND** is reviewable via the normal PR flow

### Requirement: PR-preview infrastructure is supported but deferred

The chosen providers (Cloudflare Pages, Cloudflare Workers, Neon) SHALL each natively support per-PR ephemeral environments, so a follow-up change can add PR previews without changing provider.

#### Scenario: Provider capability is documented, implementation is out of scope

- **WHEN** this change is reviewed and archived
- **THEN** PR-preview workflows are NOT created
- **AND** the proposal explicitly records this as deferred to a future change
