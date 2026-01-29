# Add @m0n0lab/ts-types Package

**Linear Issue:** [MON-51: Setup @monolab/ts-types package structure](https://linear.app/monolab/issue/MON-51/setup-monolabtypes-package-structure)

## Why

MonoLab needs a centralized package for sharing custom TypeScript types across all projects in the monorepo. Currently, there's no dedicated location for reusable type definitions, which leads to type duplication and inconsistency across packages.

## What Changes

- Create new `@m0n0lab/ts-types` package under `packages/ts-types/`
- Setup complete package structure: `package.json`, `deno.json`, TypeScript configuration, build system, and exports
- Configure TypeScript compilation with declaration files
- Setup ESM-only exports following project conventions
- Configure JSR (JavaScript Registry) publishing with `deno.json` (Deno workspace pattern)
- Add comprehensive README documentation
- **No Nx plugins** - manual configuration following is-odd/is-even pattern

## Impact

- **Affected specs**: New `types-package` capability
- **Affected code**:
  - New directory: `packages/ts-types/`
  - Workspace configuration may need updates for new package
- **Future packages**: Can import shared types from `@m0n0lab/ts-types`
