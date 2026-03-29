## Context

Monorepo has one app (`apps/demo`, SolidJS+Vite) and shared packages. No Svelte/SvelteKit presence yet. pnpm workspace auto-discovers `apps/*`. Nx has minimal plugins (`@nx/js` + `nx`), relies on inference for targets.

SvelteKit generates `.svelte-kit/tsconfig.json` at sync time with paths, module config, and `noEmit: true`. This conflicts with monorepo's `composite: true` and `incremental: true`.

## Goals / Non-Goals

**Goals:**
- Scaffold SvelteKit 5 app via official CLI (`sv create`) — skeleton + TS
- Integrate tsconfig with monorepo strictness via TS 5.5+ array extends
- Nx discovers and runs targets via `package.json` script inference
- `pnpm nx run @m0n0lab/green-beard:dev` works

**Non-Goals:**
- Nx plugin for Svelte (manual management)
- Shared Svelte component library
- Database, auth, API routes — future work
- Custom adapter selection (use `adapter-auto` default)
- Linting/formatting setup (future change)

## Decisions

### 1. Scaffold via `sv create` not manual setup
**Choice**: `pnpm dlx sv create apps/green-beard` with skeleton + TS options
**Why**: Official CLI ensures correct file structure, latest Svelte 5 defaults, proper `svelte.config.js`. Manual setup risks missing generated types setup.
**Alternative**: Manual `pnpm add svelte @sveltejs/kit` + copy files — fragile, version mismatch risk.

### 2. TSConfig array extends
**Choice**: `"extends": ["./.svelte-kit/tsconfig.json", "@m0n0lab/ts-configs/tsconfig.base.json"]` with local overrides
**Why**: Gets monorepo strictness flags (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, etc.) without copy-paste. Last entry wins on conflicts.
**Overrides needed**:
- `composite: false` — SvelteKit uses `noEmit: true`, incompatible with composite
- `incremental: false` — no value without emit
- `noEmit: true` — Vite handles build
- `module: "preserve"` — keep from web.base, SvelteKit sets `esnext` but `preserve` works with bundler resolution
**Alternative**: Copy strictness flags inline — works but drifts from shared config.

### 3. No `project.json` — Nx inference only
**Choice**: Let Nx infer `dev`, `build`, `preview` from `package.json` scripts
**Why**: User preference for manual control. SvelteKit scripts are standard (`vite dev`, `vite build`, `vite preview`). Nx crystal plugin handles inference.
**Alternative**: Explicit `project.json` — unnecessary overhead for standard Vite scripts.

### 4. Package naming: `@m0n0lab/green-beard`
**Choice**: Follow monorepo scope convention
**Why**: Consistent with `@m0n0lab/demo`, `@m0n0lab/react-clean`, etc. Private package (`"private": true`).

## Risks / Trade-offs

- **`exactOptionalPropertyTypes` friction** → Accept and fix if Svelte types complain. Can disable per-file with `// @ts-expect-error` or relax in tsconfig later.
- **`sv create` interactive prompts** → Use `--template minimal --types ts` flags or pipe answers. If CLI changes flags, fallback to interactive.
- **`.svelte-kit/` in gitignore** → Must run `svelte-kit sync` (or `dev`/`build`) to generate tsconfig base. Add `prepare` script: `svelte-kit sync`.
- **Nx cache with SvelteKit** → `.svelte-kit/` is a build artifact. May need `outputs` config in `targetDefaults` later. Not blocking for kick-off.
