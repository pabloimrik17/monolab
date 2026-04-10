# sveltekit-app-scaffold Specification

## Purpose

SvelteKit 5 app bootstrapped in Nx+pnpm monorepo with shared tsconfig integration.

## Requirements

### Requirement: SvelteKit app scaffolded via official CLI
The system SHALL have a SvelteKit 5 app at `apps/green-beard/` created using the official `sv create` CLI with skeleton template and TypeScript.

#### Scenario: App directory exists with SvelteKit structure
- **WHEN** scaffolding is complete
- **THEN** `apps/green-beard/` contains `src/routes/+page.svelte`, `svelte.config.js`, `vite.config.ts`, `app.html`, and `package.json`

#### Scenario: Package identity
- **WHEN** reading `apps/green-beard/package.json`
- **THEN** `name` is `@m0n0lab/green-beard` and `private` is `true`

### Requirement: TSConfig integrates monorepo strictness
The tsconfig SHALL use TS 5.5+ array extends to inherit from both `.svelte-kit/tsconfig.json` and `@m0n0lab/ts-configs/tsconfig.base.json`, with local overrides for SvelteKit compatibility.

#### Scenario: Array extends configured
- **WHEN** reading `apps/green-beard/tsconfig.json`
- **THEN** `extends` is `["./.svelte-kit/tsconfig.json", "@m0n0lab/ts-configs/tsconfig.base.json"]`

#### Scenario: Compatibility overrides present
- **WHEN** reading `apps/green-beard/tsconfig.json` compilerOptions
- **THEN** `composite` is `false`, `incremental` is `false`, `noEmit` is `true`

#### Scenario: Monorepo strictness flags active
- **WHEN** TypeScript resolves the effective config
- **THEN** `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`, `noImplicitOverride`, `noImplicitReturns` are all `true`

### Requirement: Nx discovers project with minimal project.json
The app SHALL have a minimal `project.json` following the `apps/demo` pattern, with targets inferred from `package.json` scripts.

#### Scenario: Nx lists the project
- **WHEN** running `pnpm nx show project @m0n0lab/green-beard`
- **THEN** Nx outputs project metadata with inferred targets

#### Scenario: Dev server runs via Nx
- **WHEN** running `pnpm nx run @m0n0lab/green-beard:dev`
- **THEN** SvelteKit dev server starts successfully

#### Scenario: Minimal project.json exists
- **WHEN** reading `apps/green-beard/project.json`
- **THEN** it contains `name`, `sourceRoot`, `projectType` and no explicit targets

### Requirement: Hello World landing page
The app SHALL display a Green Beard hello world on the root route.

#### Scenario: Root route renders greeting
- **WHEN** navigating to `/` in the browser
- **THEN** the page displays text containing "Green Beard"

### Requirement: pnpm workspace registration
The app SHALL be recognized as a pnpm workspace package.

#### Scenario: Workspace resolves package
- **WHEN** running `pnpm ls --filter @m0n0lab/green-beard`
- **THEN** the package is listed without errors

### Requirement: svelte-kit sync in prepare script
The app SHALL have a `prepare` script that runs `svelte-kit sync` to generate the `.svelte-kit/` directory including the base tsconfig.

#### Scenario: Prepare script configured
- **WHEN** reading `apps/green-beard/package.json` scripts
- **THEN** `prepare` is `svelte-kit sync`
