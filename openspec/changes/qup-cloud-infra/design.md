## Context

Qup is a 2-app stack (`qup-web` SolidStart SSR, `qup-api` Hono+Drizzle+pg) currently runnable only via local `docker-compose.yml`. Owner runs it as a hobby project (no income), wants a free-forever cloud target that supports PR previews later and gates deploys on CI green. Existing in-flight `qup` change defines runtime capabilities; this change is purely about the deployment substrate underneath them.

## Goals / Non-Goals

**Goals:**

- Pick one provider stack and commit; avoid drift across hobby projects
- Two persistent envs from branches: `develop` → dev, `main` → prod
- Deploys gated on green CI — no Git→provider auto-deploy
- IaC for everything (CF + Neon resources, GH secrets out-of-scope)
- Local dev (Docker pg) unaffected
- Future-proof for ephemeral PR-preview envs (don't build them now, but pick providers that natively support them)

**Non-Goals:**

- PR-preview infra (deferred to a follow-up change)
- Custom domains (use provider-default subdomains for both envs)
- Multi-region, observability stack, alerting, on-call — out of scope for hobby tier
- Migrating other monorepo apps (`investlab`, `wealth-react`, `green-beard`); same decision can be re-applied later, but this change touches only qup

## Decisions

### 1. Cloudflare over Vercel for hosting

**Choice:** Cloudflare Pages (qup-web) + Cloudflare Workers (qup-api).

**Why:** Vercel Hobby's "no commercial use" clause is a forced-migration trigger if anything changes; Vercel has tightened free-tier pricing/limits repeatedly (2023 Pro push, 2024 fluid compute) and there is a real bill-shock pattern on its free tier (DDoS/viral traffic → "you owe us" stance). Cloudflare's free tier is structurally bounded (hard limits, not overages — cannot bill without a payment method on file), has no commercial-use clause, and has historically expanded rather than contracted.

**Alternatives considered:**

- *Vercel Hobby*: best DX for SolidStart, but the bill-shock + ToS-volatility profile is the wrong fit for "set and forget, must stay free."
- *Netlify Free + Fly.io*: zero code-refactor (Node everywhere), but backend PR previews are DIY and Fly is no longer truly free. Loses on the future-proofing axis.
- *Render*: free tier spins down (30-60s cold start), PR previews are paid Team plan ($19+/mo). Disqualified.

### 2. Neon Postgres

**Choice:** Neon free tier, one project, one branch per env (`develop`, `main`).

**Why:** Free Postgres with native branching primitive (free, includes copy-on-write data). Unlocks DB-per-PR-preview later without changing provider. HTTP driver works on Workers (no TCP).

**Alternatives considered:**

- *Supabase*: branching was paid-only until recently; free tier has only 2 projects.
- *Turso (SQLite)*: paradigm shift; Drizzle supports it but the qup `qup` change is already written against Postgres.
- *Cloudflare D1*: native to CF, but SQLite-only and Drizzle adapter is less mature; locks out future Postgres-only features.

### 3. SST v3 for IaC, Pulumi for the Neon seam

**Choice:** Single `sst.config.ts` at repo root. CF resources via SST components (`sst.cloudflare.Worker`, `sst.cloudflare.x.SolidStart`). Neon resources via `@pulumiverse/neon` declared inside the SST `run()` function (SST runs on Pulumi, so this is a sanctioned escape hatch, not a hack).

**Why:** TS-native (no HCL context-switch alongside the TS app code), built-in stages/linking model maps perfectly onto the two-env requirement, ~half the LOC of raw Pulumi, the `sst dev` live-cloud workflow is a real productivity win for hobby iteration. Pulumi state under the hood is a known, stable substrate.

**Alternatives considered:**

- *Pulumi (raw)*: lower-level, more LOC, but lower lock-in and longer maturity track record. Reject because the LOC overhead and lack of built-in linking hurt hobby motivation.
- *Terraform / OpenTofu*: industry standard, but HCL is a context-switch and there are no first-class TS-app abstractions. Reject for TS-only stack.
- *Wrangler config alone*: not real IaC; Neon and routes still manual.

**Risk owned:** SST v3 (Ion) is newer (GA 2024) and the v2→v3 break was painful. Owner accepts this because rewrite cost is bounded (one config file, ~100 LOC).

### 4. Two CF projects, not one merged Worker

**Choice:** `qup-web` is its own Cloudflare Pages project; `qup-api` is its own Cloudflare Worker. They communicate over the public network.

**Why:** Matches the current `docker-compose.yml` split (api as separate service). Decouples deploy lifecycle — frontend tweaks don't redeploy the API and vice versa. Keeps the API independently consumable if/when another app needs it.

**Trade-off:** Need CORS (or same root domain via CF Routes once a custom domain exists). For default `*.pages.dev` + `*.workers.dev` URLs, CORS is required.

### 5. Hono goes native on Workers; drop `@hono/node-server`

**Choice:** Replace `import { serve } from "@hono/node-server"` entry with the Workers `fetch` export. Hono supports both natively.

**Why:** Workers is the deployment target; no Node runtime in production. Hono's API is identical across runtimes — the only delta is the entry shape (`export default { fetch: app.fetch }`).

**Trade-off:** Local dev via `tsx watch` no longer matches production runtime. Mitigated by `wrangler dev` for parity when needed; default local dev keeps using `tsx` for speed.

### 6. Drizzle adapter swap: `node-postgres` → `neon-serverless` (WebSocket)

**Choice:** Swap `drizzle-orm/node-postgres` for `drizzle-orm/neon-serverless` in the deployed Workers runtime; keep `drizzle-orm/node-postgres` for local dev against Docker Postgres. The single npm package `@neondatabase/serverless` exposes both the HTTP and the WebSocket clients — the dialect is shared (`drizzle-orm/pg-core`); only the driver shape differs.

**Why NOT `neon-http` (rejected):** `neon-http` does not support multi-statement transactions (each HTTP request is a stateless one-shot). `packages/qup-data/src/repositories/pg-order.repository.ts` already uses `db.transaction(...)` to insert an Order with its OrderItems atomically. Choosing `neon-http` would silently break order creation. `neon-serverless` (WebSocket) supports full Postgres transactions on Workers and is the documented Neon driver for code that needs them.

**Why this works:** Workers has no raw TCP but does have `WebSocket`. `@neondatabase/serverless` opens a WebSocket to a Neon proxy that speaks the Postgres wire protocol on the other side. Drizzle schema, queries, types, migrations — all unchanged. Postgres remains Postgres.

**Trade-off:** Local dev against Docker Postgres still uses TCP via `pg`. **Approach:** factor a `createDb()` builder in `packages/qup-data` that returns a `PgDatabase<...>` (Drizzle's shared base type) regardless of underlying driver. Workers runtime → `drizzle(neon(databaseUrl))`; Node runtime → `drizzle(new Pool({ connectionString: databaseUrl }))`. Repositories type their `db` argument as the shared base, not as a driver-specific concrete type.

**Risk:** Per-driver behaviour differences beyond transactions (prepared statements not supported by `neon-serverless`, LISTEN/NOTIFY limited). Mitigation: qup does not currently use those features; an integration test exercises the critical write paths on both drivers.

### 7. Deploy via GH Actions + wrangler, not Git→CF auto-deploy

**Choice:** Do not connect the repo in Cloudflare's dashboard. All deploys come from GitHub Actions running `wrangler deploy` (or `sst deploy --stage <env>`) after CI gates pass.

**Why:** Natural CI gate by construction — if CI doesn't run, deploy doesn't run. Avoids the "CF deployed bad code while CI was still failing" race.

**Branch → env mapping:**

```
  push develop  →  ci.yml (lint+typecheck+test+build) →  sst deploy --stage dev
  push main     →  ci.yml (lint+typecheck+test+build) →  sst deploy --stage prod
```

`sst.config.ts` derives env-specific config (Worker name suffix, Neon branch, secrets) from `$app.stage`.

### 8. Local dev unaffected

**Choice:** Keep `apps/qup-api/docker-compose.yml` for local Postgres. Do not introduce SST or Neon into the local-dev flow.

**Why:** SST's `sst dev` is great but requires CF/Neon credentials, which is friction for the inner dev loop. Local Docker pg + `tsx watch` is faster and offline-capable.

## Risks / Trade-offs

- **SST v3 volatility** → Mitigation: pin SST version, treat `sst.config.ts` as a thin file (push complexity into provider-level resources), accept a possible v3→v4 rewrite later
- **Workers cold starts on free tier** → Mitigation: free tier is acceptable for hobby; cold starts on Workers are ~5-50ms (much better than Render's 30s); not a blocker
- **Neon autosuspend latency** (free tier suspends DB after 5 min idle, first hit pays ~500ms) → Mitigation: acceptable for hobby; Neon roadmap reduces this; alternative is paid tier
- **Drizzle driver divergence** (node-postgres vs neon-http behave subtly differently for transactions, prepared statements) → Mitigation: keep a focused integration test that runs the critical write paths against both drivers in CI
- **Pulumi Cloud state coupling** → Mitigation: Pulumi Cloud Individual is free for personal projects; if it ever changes, swap to S3 backend (one config line)
- **CORS overhead from two-project split** → Mitigation: explicit `cors()` middleware in Hono; revisit if a single root domain becomes available
- **Single-provider concentration risk** (CF outage takes both apps down) → Mitigation: acceptable for hobby; multi-cloud is out of scope

## Migration Plan

1. **Phase 1 — IaC + accounts (no deploy)**: create CF account, Neon project, Pulumi Cloud account; commit `sst.config.ts` declaring resources; manually verify `sst deploy --stage dev` succeeds from a local machine
2. **Phase 2 — Runtime adapter swap**: change Hono entry, Drizzle adapter, vinxi preset on a feature branch; verify local dev still works (Docker pg + tsx)
3. **Phase 3 — CI wiring**: add `.github/workflows/deploy.yml` triggered on `develop` and `main` pushes; first deploys are manual `workflow_dispatch` to verify; flip to push-triggered once green
4. **Phase 4 — Verify two-env**: merge a no-op PR to `develop`, observe dev deploy; tag-merge to `main`, observe prod deploy

**Rollback:** Revert the change branch. Docker Compose path still works for local; CF resources can stay or be torn down via `sst remove`.

## Open Questions

- Should `sst.config.ts` live at repo root or in `apps/`? (Likely root — applies to whole monorepo as more apps adopt this pattern.)
- Pulumi Cloud individual tier or S3 state backend from day 1? (Default to Pulumi Cloud for DX; revisit if it ever costs money.)
- Should the Drizzle `createDb()` switch on `process.env.RUNTIME` or on whether `@neondatabase/serverless` is available? (Tasks artifact will pick one; not blocking.)
