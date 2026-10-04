# Research — group nx-1

## @nx/js (23.0.2 → 23.1.0)

### Workarounds resolved (universal)

- Incremental type-check `.tsbuildinfo` is now scoped per project (#36137). Previously a shared/overlapping tsbuildinfo could cache a partial or stale type-check result across projects; workspaces that had disabled incremental type-check, deleted tsbuildinfo between builds, or otherwise routed around cross-project cache bleed can drop that mitigation.
- Doubled output paths in buildable-library path mappings are fixed (#36138). Manual path-mapping corrections for buildable libs are no longer needed.
- tsc builds no longer emit spurious TS6059 rootDir errors on Windows (#36184), and TS6059 is prevented when an app/webpack build imports a workspace lib from source (#36217, #36188). rootDir is now pinned even when it matches the config directory (#36272) and on composite tsconfigs for TS6/ts-jest (#36285). Hand-authored rootDir/include tweaks added to silence TS6059 can be reverted.
- `catalog:` references are now resolved in pruned `package.json` output (#35805), and the npm `allowScripts` allowlist is preserved when pruning (#36016). Post-prune fixups for catalog specifiers or lost allowScripts entries are no longer necessary.
- Import locator no longer panics on unicode source positions (#36133) — removes the need to exclude files that tripped the locator.

### Improvements applicable (universal)

- `@swc/cli` bumped to 0.8.1 to patch a critical `decompress` advisory (#36294). Security-relevant transitive; applies to any project using the @nx/js swc build path.
- TypeScript 6 readiness hardening: restores the pre-TS6 default of loading all `@types` (#36163), preserves the `esModuleInterop` default when migrating to TS6 (#36225), and keeps tsconfigs compiling and config files loading under TS6 (#36245). Smooths any future move onto TypeScript 6.
- Node executor now waits for the full process tree to exit when stopping tasks (#36230), avoiding orphaned child processes on task teardown.
- Vite integration gains configurable TS-paths build/test targets and more stable build coordination (#34890); vitest can pass `mode` through and applies mode-based config consistently (#35069, #36041). Relevant to any @nx/js lib built/tested via the vite/vitest executors.
- `devkit` `formatFiles` restores prettier v2 support (#36193) for workspaces still on prettier 2.

Hint: Highest-value items are TypeScript-6-readiness fixes and the per-project `.tsbuildinfo` scoping, most impactful for buildable-library workspaces compiling with `tsc -b`; the `@swc/cli` 0.8.1 bump is a security-relevant transitive worth surfacing regardless of build path.
