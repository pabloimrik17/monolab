# Changeset: monolab (deep-minor)

Scope: 56 in-scope improvement bullets (monolab-affecting). Recon was read-only. Repo is a
minimal, well-curated Nx multi-monorepo — most bullets are automatic version-bump wins,
tooling surfaces, or features this repo does not use, so they need no edit.

## Applicable (1)

### eslint — no-constant-binary-expression gains a checkRelationalComparisons option

- **File**: /workspace/monolab.deps-minor-2026-07-18/eslint.config.ts
- **Description**: Opt into `checkRelationalComparisons` for the already-active
  `no-constant-binary-expression` rule (part of `eslint.configs.recommended`, severity `error`)
  by adding one explicit entry to the final rules block. Flags constant relational comparisons
  (e.g. `x = 1 < 2`) in addition to the defaults. The project already curates rules here
  (`preserve-caught-error`, custom `no-unused-vars`), so this fits.
- **Caveat (turn-2)**: cannot run lint in turn 1. Before finalizing, run
  `pnpm exec nx run-many -t lint:eslint` (or `nx affected -t lint:eslint`) and drop this edit
  if it surfaces any new violation (pre-commit + CI both gate on eslint). Risk is low — constant
  relational comparisons are a rare pattern in this codebase. This is optional lint hardening,
  not required by the bump.

**Before** (rules block, ~L80-93):

```ts
    {
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    enableAutofixRemoval: { imports: true },
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "preserve-caught-error": "warn",
        },
    },
```

**After**:

```ts
    {
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    enableAutofixRemoval: { imports: true },
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "no-constant-binary-expression": ["error", { checkRelationalComparisons: true }],
            "preserve-caught-error": "warn",
        },
    },
```

## Inapplicable (55)

- @commitlint/cli resolve-extends pure-ESM presets — config extends only `@commitlint/config-conventional` (bumped in lockstep, CJS-compatible), not an ESM-only third-party preset; nothing to change.
- @nx/js @swc/cli 0.8.1 decompress advisory — security fix in a transitive; delivered automatically by the bump, no code change.
- @nx/js Node executor waits for full process tree — transparent runtime fix, no config change.
- @nx/js Vite integration configurable TS-paths targets — repo tests via the `@nx/js/typescript` plugin + vitest configs, not the `@nx/vite`/`@nx/vitest` executors; the new build/test targets don't apply.
- @nx/js TypeScript 6 readiness hardening — repo is already on TS 6.0.3; the fixes are internal to `@nx/js` (restore all-@types default, esModuleInterop, TS6 compile), no repo edit.
- @nx/js devkit formatFiles restores prettier v2 — repo uses oxfmt, no prettier anywhere; irrelevant.
- @react-router/dev non-Node web-streams default entry (delete entry.server.tsx) — wealth-react is a Node-adapter app (declares `@react-router/node` + `@react-router/serve`), and the bullet's safe-delete promise is scoped to _non-Node_ apps; its `entry.server.tsx` (stock `renderToPipeableStream`) stays. (See Notes.)
- @react-router/dev unstable_enableNodeReadableStream flag — unstable future flag, explicitly not recommended for production; leave off.
- @react-router/dev rolldownOptions detected under Vite 8+ — no custom Rolldown config in wealth-react; nothing to respect.
- @react-router/dev nub package-manager detection — repo uses pnpm; irrelevant.
- @react-router/serve get-port dropped — leaner transitive delivered automatically, no config change.
- @sveltejs/kit prerendered .md/.mdx precompression — green-beard prerenders no markdown content; automatic anyway.
- @sveltejs/kit remote-form ergonomics / public enhance types — green-beard uses no remote forms or custom enhance callbacks.
- @sveltejs/kit prerender.handleInvalidUrl option — green-beard has no prerender/crawl configuration.
- @sveltejs/kit defineEnvVars exported from `/env` — green-beard defines no typed env vars; no import to migrate.
- @sveltejs/vite-plugin-svelte inspector context menu — dev-only; green-beard's `vite.config.ts` enables no inspector option.
- eslint preserve-caught-error errorClassNames option — repo's custom errors all `extends Error` (DomainError, HttpError), so the rule already recognizes them; the option adds nothing.
- eslint max-nested-callbacks constructor-callback counting — rule is not enabled in the flat config; adopting it would be an unrelated opinionated addition, not a bump-driven edit.
- eslint radix computed Number.parseInt / signed radix — accuracy is automatic and the `radix` rule is not enabled here.
- eslint no-compare-neg-zero autofix suggestions — automatic editor behavior, no config change.
- eslint Node.js 26 added to CI matrix — concerns eslint's own CI, not this repo.
- fallow dev-dependency-in-production rule — ships enabled at `warn` by default; activates automatically with no config edit (suppress per-package only if a real finding appears).
- fallow health.maxUnitSize configurable — no evidence the 60-LOC default is too strict here; raising it speculatively would weaken a signal, so no edit.
- fallow recommend onboarding surface — a read-only CLI/MCP tool, not a config change.
- fallow CI integration (sticky comment, Check Run, annotations) — already adopted: ci.yml uses the `fallow-rs/fallow` action with `comment: true` and grants `pull-requests: write` + `checks: write`; the npm `fallow` bump doesn't drive the action version.
- fallow install/runtime efficiency (multicall binary, faster engine) — automatic supply-chain/perf win, no config change.
- fallow self-documenting schema — aids config authoring; no repo edit implied.
- fallow governance surfaces (suppressions, impact_closure, plugin-check) — read-only tooling, no config change.
- fallow machine-consumer ergonomics (compact json, `--pretty`, typed error envelope) — CLI output behavior, no config change.
- inversify jitless option (default true) — the CSP-safe `jitless: true` default already applies; `new Container()` needs no options, and no consumer needs the JIT path (hint: leave at default).
- inversify faster instance resolution — transparent runtime gain, no API/call-site change.
- markdownlint-cli 0.41.0 engine (MD022/028/035/042/051/060 accuracy) — automatic engine improvement, no `.markdownlintrc` change.
- markdownlint-cli MD029 accuracy — automatic engine improvement, no config change.
- markdownlint-cli 0.41.1 engine refresh — automatic, no config change.
- nx end-of-run performance report — zero-config additive observability, no edit.
- nx more memory-efficient task hashing/caching — automatic, no config change.
- nx targetDefaults nested-array (filtered) shape — nx.json targetDefaults are keyed per-target, not differentiated across target groups; the nested shape (hint: only where already differentiated) doesn't apply.
- nx terminal-UI mouse support — automatic TUI behavior, no config change.
- nx create-nx-workspace scaffold-into-cwd — workspace-creation feature, N/A to an existing repo.
- nx release force-changelog option — repo's `nx release` scripts (react-clean/react-hooks, `--skip-publish`) are manual and don't skip changelog generation; no need for the force flag, and the breaking-change fix is automatic.
- nx devkit @nx/esbuild/executors export + isCacheableTask — plugin-author surface; repo authors no Nx plugins.
- playwright WebAuthn virtual authenticator — repo has no `@playwright/test` suites (playwright is only the `@vitest/browser-playwright` backend); nothing to test with it.
- playwright WebStorage API (page.localStorage/sessionStorage) — no Playwright test runner in use; N/A.
- playwright test-runner config/CLI additions (video modes, expect.soft.poll, fullConfig, -G) — no `playwright.config`/test runner in this repo.
- playwright network/screencast additions — no Playwright test runner in use; N/A.
- playwright Ubuntu 26.04 support / HAR+trace WebSocket capture — no Playwright test runner in use; N/A.
- react-router instrumentation hooks route metadata — repo registers no instrumentation hooks in wealth-react.
- react-router ReactFormState typing — no consumer works with server-rendered form state; automatic typing improvement anyway.
- svelte-check tsgo experimental backend — experimental; hint says keep off by default. No opt-in.
- svelte-check +error.svelte props typed zero-config — green-beard has no `+error.svelte`; automatic when one exists, no edit.
- svelte-check --config CLI option — green-beard has a single `svelte.config.js` at the app root that implicit discovery already resolves; adding `--config` is redundant noise.
- tsx faster CLI startup (lazy esbuild/cache) — automatic runtime gain for `qup-api`'s `tsx watch`, no code change.
- tsx direct Node TS module-format mapping — automatic loader-path optimization, no code change.
- tsx synchronous module hooks on Node ≥22.22.3 — automatic, runtime-gated, no code change.
- tsx fewer filesystem probes during resolution — automatic I/O reduction, no code change.

## Notes (out of scope)

- wealth-react `app/entry.server.tsx` is the stock React Router Node template (plain `renderToPipeableStream`, no custom logic). Since the app is Node-adapter, the deletion the react-router bullet promises for _non-Node_ apps isn't guaranteed here — but the file could still be reviewed for removal to rely on React Router's built-in Node default. Verify behavior parity (headers, abort delay) before deleting; not one of the 56 bullets.
- markdownlint-cli 0.49.1 (markdownlint 0.41.x) drops end-of-life Node 20. Out of scope for this npm-minor run, but worth confirming the repo's `engines`/CI Node major meets the new minimum during the engines pass.

## Summary

- applicable: 1
- inapplicable: 55
