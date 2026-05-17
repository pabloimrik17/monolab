# Implementation Tasks

## 1. Rename Directories

- [ ] 1.1 Rename `apps/wealth-react` to `apps/investlab`
- [ ] 1.2 Rename `packages/wealth-tracker-core` to `packages/investlab-core`

## 2. Update Package Manifests

- [ ] 2.1 Update `apps/investlab/package.json` name to `@m0n0lab/investlab`
- [ ] 2.2 Update `packages/investlab-core/package.json` name to `@m0n0lab/investlab-core`
- [ ] 2.3 Update `workspace:*` dependency references in app's package.json

## 3. Update Nx Configuration

- [ ] 3.1 Update `apps/investlab/project.json` project name to `investlab`
- [ ] 3.2 Update `packages/investlab-core/project.json` project name to `investlab-core`
- [ ] 3.3 Update any nx.json references to old project names

## 4. Update Import References

- [ ] 4.1 Replace all `@m0n0lab/wealth-tracker-core` imports with `@m0n0lab/investlab-core`
- [ ] 4.2 Update tsconfig paths/references for new package locations
- [ ] 4.3 Update vite.config.ts, react-router.config.ts if they reference old names

## 5. Verify

- [ ] 5.1 Grep for remaining `wealth-react` references
- [ ] 5.2 Grep for remaining `wealth-tracker-core` references
- [ ] 5.3 Run `pnpm nx run investlab-core:build`
- [ ] 5.4 Run `pnpm nx run investlab:build`
