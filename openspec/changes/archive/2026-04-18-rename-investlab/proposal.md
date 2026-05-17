## Why

`wealth-react` and `wealth-tracker-core` don't reflect the app's purpose: investment portfolio tracking and active trading management. Renaming to InvestLab aligns with the monorepo naming (MonoLab) and the investment focus.

## What Changes

- Rename `apps/wealth-react` → `apps/investlab`
- Rename `packages/wealth-tracker-core` → `packages/investlab-core`
- Update all workspace references, imports, nx project names
- Update package.json names (`@m0n0lab/investlab`, `@m0n0lab/investlab-core`)
- Update React Router config, vite config, tsconfig references

## Capabilities

### Modified Capabilities

- Existing ticker tracking functionality preserved, only naming changes

## Impact

- **Renamed projects**: `wealth-react` → `investlab`, `wealth-tracker-core` → `investlab-core`
- **Workspace config**: pnpm-workspace.yaml unchanged (already covers `apps/*`, `packages/*`)
- **Nx config**: Project names change, target references update
- **No functional changes**: Pure rename/refactor
