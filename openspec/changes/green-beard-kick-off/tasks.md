## 1. Scaffold SvelteKit app

- [x] 1.1 Run `pnpm dlx sv create apps/green-beard` (skeleton + TS, no add-ons)
- [x] 1.2 Rename package to `@m0n0lab/green-beard`, set `"private": true`
- [x] 1.3 Add `"prepare": "svelte-kit sync"` script to package.json

## 2. TSConfig integration

- [x] 2.1 Replace `tsconfig.json` extends with array: `["./.svelte-kit/tsconfig.json", "@m0n0lab/ts-configs/tsconfig.base.json"]`
- [x] 2.2 Add local overrides: `composite: false`, `incremental: false`, `noEmit: true` (no `module` override needed — `.svelte-kit/tsconfig.json` sets `esnext`)
- [x] 2.3 Remove options already covered by monorepo base (dedup)
- [x] 2.4 Add `@m0n0lab/ts-configs` as `workspace:*` devDependency

## 3. Install and verify

- [ ] 3.1 Run `pnpm install` from workspace root
- [ ] 3.2 Run `pnpm nx run @m0n0lab/green-beard:dev` — confirm dev server starts
- [ ] 3.3 Run `pnpm nx show project @m0n0lab/green-beard` — confirm Nx inference works

## 4. Hello World page

- [ ] 4.1 Update `src/routes/+page.svelte` with Green Beard greeting
- [ ] 4.2 Verify page renders at `/`

## 5. Nx project metadata

- [ ] 5.1 Create minimal `project.json` (name, sourceRoot, projectType) following `apps/demo` pattern
- [ ] 5.2 Verify `pnpm ls --filter @m0n0lab/green-beard` resolves
