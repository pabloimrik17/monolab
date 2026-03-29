## Why

Personal plant sales project needs an internal logistics dashboard for managing cultivation, pricing, and inventory. SvelteKit chosen for its SSR capabilities and future public web potential. Starting with minimal scaffold to validate monorepo integration.

## What Changes

- Scaffold new SvelteKit 5 app at `apps/green-beard/` via official `sv create` CLI (skeleton + TS)
- Integrate with monorepo tsconfig via array extends (`.svelte-kit/tsconfig.json` + `@m0n0lab/ts-configs/tsconfig.base.json`)
- Override `composite`/`incremental` to `false` and keep `noEmit: true` for SvelteKit/Vite compatibility
- Register as pnpm workspace package `@m0n0lab/green-beard`
- Nx target inference from `package.json` scripts (no `project.json`, no Nx plugin)
- Hello World landing page confirming setup works

## Capabilities

### New Capabilities
- `sveltekit-app-scaffold`: SvelteKit 5 app bootstrapped in Nx+pnpm monorepo with shared tsconfig integration and Nx inference

### Modified Capabilities
<!-- None -->

## Impact

- **New dependency tree**: `svelte`, `@sveltejs/kit`, `@sveltejs/adapter-auto`, `vite` added to workspace
- **pnpm workspace**: new `apps/green-beard` package auto-discovered via `apps/*` glob
- **Nx**: new project inferred, targets: `dev`, `build`, `preview`
- **tsconfig**: monorepo strictness flags applied to SvelteKit app, potential `exactOptionalPropertyTypes` friction with Svelte types (accepted risk)
