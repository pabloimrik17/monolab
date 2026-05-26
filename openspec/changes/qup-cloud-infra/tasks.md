## 1. Accounts and bootstrap (manual, one-time)

- [ ] 1.1 Create Cloudflare account and capture `CLOUDFLARE_ACCOUNT_ID` + scoped `CLOUDFLARE_API_TOKEN` (Workers Scripts:Edit, Pages:Edit, Account:Read)
- [ ] 1.2 Create Neon account and capture `NEON_API_KEY`
- [ ] 1.3 Create Pulumi Cloud account (individual tier) and capture `PULUMI_ACCESS_TOKEN`
- [ ] 1.4 Add `dev` and `prod` GitHub Environments to the repo with the three secrets above scoped per env (different `CLOUDFLARE_API_TOKEN` values OK; Neon/Pulumi tokens shared)

## 2. Workspace dependencies

- [ ] 2.1 Add dev deps to root: `sst@^3`, `@pulumi/cloudflare`, `@pulumiverse/neon`
- [ ] 2.2 Add runtime dep to `apps/qup-api`: `@neondatabase/serverless`
- [ ] 2.3 Remove from `apps/qup-api`: `@hono/node-server`, `pg`, `@types/pg` (only from this app's `package.json` — local dev no longer needs them once `createDb()` is centralised in `packages/qup-data`)
- [ ] 2.4 Confirm `pnpm install` succeeds and Nx project graph regenerates cleanly via `pnpm nx graph --file=/tmp/graph.json`

## 3. Drizzle adapter abstraction (packages/qup-data)

- [ ] 3.1 In `packages/qup-data/src`, factor a `createDb(databaseUrl: string)` factory that selects driver by runtime: `globalThis.WebSocketPair` (Workers) ⇒ `drizzle-orm/neon-serverless` over `@neondatabase/serverless` WebSocket client; otherwise ⇒ `drizzle-orm/node-postgres` over `pg`
- [ ] 3.2 Change repository constructor types from `NodePgDatabase` to the shared `PgDatabase<...>` base type from `drizzle-orm/pg-core` so both drivers satisfy them (touches at least `pg-order.repository.ts`, plus any other `PgXxxRepository` in `packages/qup-data/src/repositories/`)
- [ ] 3.3 Keep `pg` + `@types/pg` as runtime deps of `packages/qup-data` (still needed for the local Node branch); add `@neondatabase/serverless` as a regular dep
- [ ] 3.4 Update all `qup-api` wiring to construct the Drizzle client via the new `createDb()` factory instead of `drizzle(new Pool(...))` directly
- [ ] 3.5 Run `nx run @m0n0lab/qup-data:test:unit` and `nx run @m0n0lab/qup-api:test:unit` — must stay green against Docker Postgres
- [ ] 3.6 Add a focused integration test that exercises `pg-order.repository.ts#save` (transactional Order+OrderItems insert) against a Neon dev branch via the `neon-serverless` driver; verify the transaction commits and a forced error rolls back both inserts
- [ ] 3.7 If `packages/qup-data` exposes the Drizzle client across its package boundary, run `attw --pack` to verify exports still resolve

## 4. Hono on Workers (apps/qup-api)

- [ ] 4.1 Replace the `@hono/node-server`-based entry in `apps/qup-api/src/index.ts` with a Workers module export: `export default { fetch: app.fetch }`
- [ ] 4.2 Switch `apps/qup-api` build from `tsdown` (Node target) to `wrangler` build (or keep `tsdown` with a Workers-compatible target — pick based on bundling friction; document the choice in `tasks` follow-up if needed)
- [ ] 4.3 Add `apps/qup-api/wrangler.toml` declaring `name = "qup-api"`, `main = "src/index.ts"`, `compatibility_date`, and a `compatibility_flags = ["nodejs_compat"]` if Drizzle/Hono need any Node shim
- [ ] 4.4 Verify `wrangler dev` from `apps/qup-api` boots the API against a local Neon branch (smoke test only — local Docker pg remains the default dev path)
- [ ] 4.5 Keep `tsx watch` dev script working for the local Node path (driven by `nx run @m0n0lab/qup-api:dev`)

## 5. SolidStart on Cloudflare Pages (apps/qup-web)

- [ ] 5.1 Change `apps/qup-web/app.config.ts` server preset from `node-server` to `cloudflare-pages`
- [ ] 5.2 Verify Codecov bundle analysis still runs on the client router (the existing conditional already guards on `router === "client"`; just re-check after preset swap)
- [ ] 5.3 Run `nx run @m0n0lab/qup-web:build` and confirm `.output/` has a Workers-compatible shape (`_worker.js` or `functions/`)
- [ ] 5.4 Run `nx run @m0n0lab/qup-web:dev` locally — must still work against the local API on `localhost`

## 6. SST configuration (repo root)

- [ ] 6.1 Create `sst.config.ts` at repo root with `app.home = "cloudflare"` and a `run()` function
- [ ] 6.2 In `run()`, declare Neon resources via `@pulumiverse/neon`: one `Project` and two `Branch` resources (`develop`, `main`); export the connection string per branch
- [ ] 6.3 In `run()`, declare `sst.cloudflare.Worker` for `qup-api` with `handler: "apps/qup-api/src/index.ts"`, stage-aware Worker name, and `link: [databaseUrlSecret]`
- [ ] 6.4 In `run()`, declare `sst.cloudflare.x.SolidStart` (or `sst.cloudflare.Pages` if the SolidStart component is not yet stable) for `qup-web` with `environment: { VITE_API_URL: api.url }`
- [ ] 6.5 Add `.gitignore` entries for `.sst/`, `pulumi/.pulumi/`, and any local stage cache
- [ ] 6.6 From a local machine with credentials configured, run `sst deploy --stage dev` once to bootstrap the dev stage; verify both URLs respond

## 7. GitHub Actions deploy workflow

- [ ] 7.1 Create `.github/workflows/deploy.yml` with two jobs: `ci` (lint + typecheck + test + build via `pnpm nx affected` or `run-many`) and `deploy` (`needs: ci`)
- [ ] 7.2 Trigger workflow on `push` to `develop` and `main` only
- [ ] 7.3 In the deploy job, derive `STAGE` from `github.ref` (`develop` ⇒ `dev`, `main` ⇒ `prod`) and bind to the matching GitHub Environment so its secrets are exposed
- [ ] 7.4 Deploy step: `pnpm sst deploy --stage $STAGE`
- [ ] 7.5 Pin all third-party actions to commit SHAs to satisfy `ci-github-actions-pinning` spec
- [ ] 7.6 Add a `workflow_dispatch` trigger for manual bootstrap deploys; document its use in `RELEASE.md` or a new `DEPLOY.md`

## 8. Verification

- [ ] 8.1 Open a PR with a trivial visible change (e.g., a footer string), merge to `develop`; confirm the workflow runs, deploy job is gated on CI green, and the dev Pages URL reflects the change
- [ ] 8.2 Merge `develop` into `main`; confirm the prod Pages URL reflects the change and the dev URL is unaffected
- [ ] 8.3 Force a test failure on a `develop`-targeted PR after merge; confirm the deploy job does not run and the previously deployed dev commit is still live
- [ ] 8.4 Run `sst remove --stage dev` from a sandboxed branch on a throwaway Pulumi stack to confirm teardown works end-to-end; recreate via `sst deploy --stage dev`
- [ ] 8.5 Run `openspec validate qup-cloud-infra --strict` and fix any remaining issues

## 9. Documentation

- [ ] 9.1 Add a `DEPLOY.md` at repo root summarising: account setup, stage→branch mapping, secret rotation, manual deploy path
- [ ] 9.2 Update `apps/qup-api/README.md` (or create it) noting the dual-driver `createDb()` and the Workers vs Node runtime split
- [ ] 9.3 Update `CLAUDE.md` if any new repo-wide command (e.g., `pnpm sst …`) becomes part of the standard workflow

## 10. Out of scope (record only, do not implement)

- [ ] 10.1 PR-preview ephemeral envs (Worker + Pages + Neon-branch per PR) — capture as a follow-up change `qup-pr-previews`
- [ ] 10.2 Custom domains for both envs — capture as follow-up `qup-custom-domains`
- [ ] 10.3 Migrating `investlab` / `wealth-react` / `green-beard` to the same stack — separate per-app changes
