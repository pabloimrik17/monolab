# Tasks: add-fallow

## 1. Install & config

- [x] 1.1 Add exact-pinned `fallow` root devDependency (newest version ≥24h old, respects `minimumReleaseAge`); `pnpm install`
- [x] 1.2 Create `.fallowrc.json` per spec (entries, ignorePatterns, ignoreDependencies, workspace ignores, publicPackages, ignoreDecorators, `require-suppression-reason: warn`); verify with `pnpm exec fallow config`
- [x] 1.3 Add `.fallow/` to `.gitignore`
- [x] 1.4 Sanity run: `pnpm exec fallow dead-code` — confirm FP count drops to just the known real+defer set

## 2. Real debt — dependency hygiene

- [x] 2.1 Move `@codecov/rollup-plugin` from root to `apps/investlab` + `apps/qup-api` devDeps
- [x] 2.2 Move `@codecov/sveltekit-plugin` from root to `apps/green-beard` devDeps
- [x] 2.3 Move `@codecov/vite-plugin` from root to `apps/demo` + `apps/qup-web` + `apps/wealth-react` devDeps
- [x] 2.4 Move `@vitejs/plugin-react-swc` from root to `packages/react-clean` + `packages/react-hooks` devDeps
- [x] 2.5 Add `@vitest/browser-playwright` to `packages/react-clean` + `packages/react-hooks` devDeps (KEEP root entry — root vitest.config.ts imports it)
- [x] 2.6 Add `@stryker-mutator/api` (9.6.1, match siblings) to root devDeps
- [x] 2.7 Remove `vite-tsconfig-paths` from root devDeps AND its `pnpm-workspace.yaml` catalog entry
- [x] 2.8 `pnpm install`; verify builds/tests unaffected (`pnpm nx run-many -t build`)

## 3. Real debt — dead code

- [x] 3.1 Delete `logout()` from `apps/qup-web/src/server/auth.ts` (dead POST-able RPC endpoint)
- [x] 3.2 Delete `apps/green-beard/src/lib/index.ts` (scaffold placeholder)
- [x] 3.3 qup-domain: delete `MenuItem.toggleAvailability` + its 2 test cases; `OrderItem.equals`; `OrderStatus.toString`; `SessionCode.equals` + its test cases; `SessionCode.toString`
- [x] 3.4 Run qup-domain tests: `pnpm nx test:unit @m0n0lab/qup-domain`

## 4. Dedup refactors (behavior-neutral)

- [x] 4.1 Add `errorJson(c, error)` to `apps/qup-api/src/errors/error-mapping.ts`; replace all 13 `toApiError`+`c.json` branches across menu/order/session routes
- [x] 4.2 Create `apps/qup-web/src/components/vm-status.tsx` (`VmStatus`, loading/error Show pair, `centered` variant); use in dashboard, admin/session/[id], session/[code]/index, session/[code]/status
- [x] 4.3 Create `apps/qup-web/src/components/order-card.tsx` (`OrderCard` + single `STATUS_COLORS`); use in admin/session/[id] (actions as children) and session/[code]/status
- [x] 4.4 Verify: `pnpm nx run-many -t build test:unit -p @m0n0lab/qup-api @m0n0lab/qup-web`; `fallow dupes` duplication <1%

## 5. Deferred debt — reasoned suppressions

- [x] 5.1 `// fallow-ignore-file unused-enum-member -- WIP investlab taxonomy, values arrive via DB casts` atop `sector.ts`, `asset-class.ts`, `instrument-type.ts` (packages/investlab-domain)
- [x] 5.2 `// fallow-ignore-file unused-class-member -- port impl bound in DI, use-cases pending` atop `pg-instrument.repository.ts`; same for `errors.ts` (abstract `code` contract)
- [x] 5.3 `// fallow-ignore-next-line unused-class-member -- tested, awaiting investlab use-cases` above `Instrument.update`
- [x] 5.4 Dup defers: `// fallow-ignore-next-line code-duplication -- page-shell divergence, PageShell extraction not yet warranted` at session/[code]/index.tsx:19+50 and order.tsx:24+47 (4 sites)
- [x] 5.5 Handle `CartItem` unused-type via config (`ignoreExportsUsedInFile` or knip-style equivalent) — fall back to inline suppression if unsupported

## 6. Scripts & CI

- [x] 6.1 Root script `"lint:fallow": "fallow dead-code --fail-on-issues"`; confirm exit 0
- [x] 6.2 ci.yml PR block: add `fallow-rs/fallow` action step, SHA-pinned `# v3.x`, `command: audit`, `comment: true` (gate new-only default); add `pull-requests: write` to job permissions
- [x] 6.3 ci.yml push block: `lint:fallow` in the run-many target list (root exposes it via `nx.includedScripts`; `cache: false` targetDefault) — as-built: nx target instead of `&& pnpm run lint:fallow`
- [x] 6.4 Verify pinning conforms to `ci-github-actions-pinning` (40-char SHA + `# vX.Y.Z` comment)
- [x] 6.5 Pre-commit: lint-staged global JS-surface function task running `fallow audit` once per commit (new-only ratchet; docs-only commits skip; lint:fallow stays push-only)

## 7. Verification

- [x] 7.1 `pnpm run lint:fallow` → 0 issues; `pnpm run lint:knip` still passes untouched
- [x] 7.2 Grep guard: no `fallow license` / `fallow coverage` / `--runtime-coverage` anywhere
- [x] 7.3 Open a test PR introducing a dummy unused export → audit comment appears, verdict fail; remove → pass

## 8. Optional / follow-ups

- [ ] 8.1 (optional) Install fallow-skills Claude Code plugin: `/plugin marketplace add fallow-rs/fallow-skills` + `/plugin install fallow@fallow-skills`
- [ ] 8.2 (optional) File upstream issues (list grew to 7 during implementation, see design as-built notes): SolidStart plugin not auto-activating; members missed via generic inference (neverthrow/`container.get<T>`); abstract-member auto-fix uncompilable; no staleness detection for config-level ignores; `ignoreDecorators` ignores class-level decorators; v3 interface-dispatch member-linking regression; v3 cross-package member-usage regression
- [ ] 8.3 (stretch) Wire real coverage into fallow health (CI lcov/coverage-final.json) to replace estimated CRAP; revisit health gating
- [ ] 8.4 (phase 2) Boundary zones for `*-domain`/`*-data`/apps layering
