## Why

Qup runs only locally (Docker Compose). Need a free-forever, commercial-clause-free cloud target that won't bill-shock a hobby project, supports PR-preview infra later, and gates deploys on CI green. Cloudflare + Neon meets all four; SST v3 keeps IaC in TS alongside the apps.

## What Changes

- **Hosting**: deploy `qup-web` to Cloudflare Pages and `qup-api` to Cloudflare Workers as two independent CF projects (independent deploy lifecycles)
- **Database**: provision Neon Postgres project with two branches (`develop`, `main`) for the two envs
- **Two envs from branches**: merge to `develop` → dev deploy; merge to `main` → prod deploy
- **CI-gated deploys**: GitHub Actions runs `lint + typecheck + test + build`; only on green does `wrangler deploy` run. No direct Git→CF auto-deploy connection.
- **IaC**: `sst.config.ts` at repo root declares CF resources via SST components; Neon resources declared via `@pulumiverse/neon` Pulumi provider as escape hatch (SST has no first-class Neon component)
- **Runtime code changes (deployment-only, no behavior change)**:
    - `qup-web/app.config.ts`: SolidStart preset `node-server` → `cloudflare-pages`
    - `qup-api/src/index.ts`: drop `@hono/node-server` wrapper (Hono runs natively on Workers)
    - `packages/qup-data`: factor a runtime-aware `createDb()`. Workers runtime uses `drizzle-orm/neon-serverless` (WebSocket — supports transactions; required because `pg-order.repository.ts` uses `db.transaction(...)`). Local Node runtime keeps `drizzle-orm/node-postgres`. Repository types widen from `NodePgDatabase` to Drizzle's shared `PgDatabase<...>` base.
- **NOT in scope**: PR-preview infra (provider chosen to support it later; setup deferred to a separate change)

## Capabilities

### New Capabilities

- `qup-cloud-hosting`: Cloudflare-based hosting topology — `qup-web` on Pages, `qup-api` on Workers, Neon Postgres for data, declared via SST + Pulumi-Neon IaC
- `qup-deploy-pipeline`: Branch-to-env mapping (`develop`→dev, `main`→prod) and CI-gated deploy flow via GitHub Actions + `wrangler`

### Modified Capabilities

None. Runtime adapter/driver swaps are deployment changes; behavior of existing `qup-web` / `qup-api` capabilities (in-flight in the `qup` change) is unchanged.

## Impact

- **New files**: `sst.config.ts`, `infra/` (Pulumi-Neon module), `.github/workflows/deploy.yml`
- **Modified files**: `apps/qup-web/app.config.ts`, `apps/qup-api/src/index.ts`, `packages/qup-data/src/db.ts` (Drizzle adapter)
- **Dependencies added**: `sst@v3`, `@pulumi/cloudflare`, `@pulumiverse/neon`, `@neondatabase/serverless`
- **Dependencies removed**: `@hono/node-server`, `pg`, `@types/pg` (from `qup-api`)
- **External accounts required**: Cloudflare (free), Neon (free), Pulumi Cloud (free individual tier) for state
- **Secrets in GH Actions**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `NEON_API_KEY`, `PULUMI_ACCESS_TOKEN`
- **Local dev unaffected**: `docker-compose.yml` keeps working for local Postgres; only deployed runtime uses Neon HTTP
