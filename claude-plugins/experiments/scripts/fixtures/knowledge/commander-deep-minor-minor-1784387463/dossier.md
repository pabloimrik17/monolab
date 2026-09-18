# Deep-minor dossier (cross-project): commander-deep-minor

Projects covered: dotfiles, monolab

## Improvements (universal — applicability checked per project at apply time)

- [medium] @commitlint/cli — resolve-extends now resolves pure-ESM presets built on conventional-changelog v7/v9/v10, so a commitlint config can `extends` modern ESM-only shareable configs directly. Hint: relevant to any repo whose commitlint config uses `extends` to pull in a shareable/preset config, especially ESM-only ("type": "module") presets or ones based on recent conventional-changelog majors. (group: commitlint-1; affects projects: dotfiles, monolab)
- [high] @nx/js — @swc/cli bumped to 0.8.1 to patch a critical decompress advisory, a security-relevant transitive for any project on the @nx/js swc build path. Hint: security-relevant transitive worth surfacing regardless of build path. (group: nx-1; affects projects: monolab)
- [medium] @nx/js — the Node executor now waits for the full process tree to exit when stopping tasks, avoiding orphaned child processes on task teardown. Hint: none. (group: nx-1; affects projects: monolab)
- [medium] @nx/js — Vite integration gains configurable TS-paths build/test targets with more stable build coordination, and vitest can pass mode through with mode-based config applied consistently. Hint: relevant to any library built or tested via the vite/vitest executors. (group: nx-1; affects projects: monolab)
- [low] @nx/js — TypeScript 6 readiness hardening restores the pre-TS6 default of loading all @types, preserves the esModuleInterop default when migrating to TS6, and keeps tsconfigs compiling and config files loading under TS6. Hint: only material to workspaces planning a move onto TypeScript 6. (group: nx-1; affects projects: monolab)
- [low] @nx/js — devkit formatFiles restores prettier v2 support. Hint: only relevant to workspaces still on prettier 2. (group: nx-1; affects projects: monolab)

## Workarounds resolved

- @commitlint/cli — `extends` against pure-ESM shareable configs/presets that transitively rely on ESM-only conventional-changelog v7/v9/v10 previously failed to resolve; projects that pinned older CJS presets, avoided ESM-only presets, or forked/inlined a config to sidestep it can drop those workarounds now that resolve-extends loads pure-ESM presets natively. Hint: relevant to repos whose commitlint config extends ESM-only shareable presets. (group: commitlint-1; affects projects: dotfiles, monolab)
- @nx/js — incremental type-check .tsbuildinfo is now scoped per project, so workspaces that disabled incremental type-check, deleted tsbuildinfo between builds, or otherwise routed around cross-project cache bleed can drop that mitigation. Hint: most relevant to buildable-library workspaces compiling with tsc -b. (group: nx-1; affects projects: monolab)
- @nx/js — doubled output paths in buildable-library path mappings are fixed, so manual path-mapping corrections for buildable libs are no longer needed. Hint: none. (group: nx-1; affects projects: monolab)
- @nx/js — spurious TS6059 rootDir errors are resolved (Windows tsc builds, apps/webpack importing a workspace lib from source, rootDir matching the config dir, and composite tsconfigs under TS6/ts-jest), so hand-authored rootDir/include tweaks added to silence them can be reverted. Hint: none. (group: nx-1; affects projects: monolab)
- @nx/js — catalog: references are now resolved in pruned package.json output and the npm allowScripts allowlist is preserved when pruning, so post-prune fixups for catalog specifiers or lost allowScripts entries are no longer necessary. Hint: none. (group: nx-1; affects projects: monolab)
- @nx/js — the import locator no longer panics on unicode source positions, removing the need to exclude files that tripped it. Hint: none. (group: nx-1; affects projects: monolab)

## Skipped or unavailable

- solo-pg-1 — fetch-changelog exited 1: no_changelog_source (non-retryable) for both pg 8.21.0 and 8.22.0; requested=2, cached=0, fetched=0, failed=2. No resolvable changelog document found for these tags.
- swc-node-1 — fetch-changelog exited non-zero: @swc-node/register 1.11.1 and 1.12.0 both failed with no_changelog_source (retryable=false); 0/2 changelogs fetched, no changelog bytes cached, so no universal findings can be derived.

## Cross-project bump set

| package                         | proposed target | projects (locations)            |
| ------------------------------- | --------------- | ------------------------------- |
| @commitlint/cli                 | 21.2.1          | dotfiles (root); monolab (root) |
| @commitlint/config-conventional | 21.2.0          | dotfiles (root); monolab (root) |
| @commitlint/types               | 21.2.0          | dotfiles (root); monolab (root) |
| @nx/js                          | 23.1.0          | monolab (root)                  |

## Changelogs

### @commitlint/cli (21.1.0 → 21.2.1)

Sources: [repository](https://github.com/conventional-changelog/commitlint) · [21.2.0](https://github.com/conventional-changelog/commitlint/releases/tag/v21.2.0) · [21.2.1](https://raw.githubusercontent.com/conventional-changelog/commitlint/master/@commitlint/cli/CHANGELOG.md)

_fixture: changelog body truncated_

### @commitlint/config-conventional (21.1.0 → 21.2.0)

Sources: [repository](https://github.com/conventional-changelog/commitlint) · [21.2.0](https://github.com/conventional-changelog/commitlint/releases/tag/v21.2.0)

<details>
<summary>21.2.0</summary>

# [21.2.0](https://github.com/conventional-changelog/commitlint/compare/v21.1.0...v21.2.0) (2026-06-30)

### Features

- feat(resolve-extends): resolve pure-ESM presets (conventional-changelog v7/v9/v10) by @escapedcat in https://github.com/conventional-changelog/commitlint/pull/4859

### Chore

- ci: install git in stock-Ubuntu baseline job by @escapedcat in https://github.com/conventional-changelog/commitlint/pull/4847

**Full Changelog**: https://github.com/conventional-changelog/commitlint/compare/v21.1.0...v21.2.0

</details>

### @commitlint/types (21.1.0 → 21.2.0)

Sources: [repository](https://github.com/conventional-changelog/commitlint) · [21.2.0](https://github.com/conventional-changelog/commitlint/releases/tag/v21.2.0)

<details>
<summary>21.2.0</summary>

# [21.2.0](https://github.com/conventional-changelog/commitlint/compare/v21.1.0...v21.2.0) (2026-06-30)

### Features

- feat(resolve-extends): resolve pure-ESM presets (conventional-changelog v7/v9/v10) by @escapedcat in https://github.com/conventional-changelog/commitlint/pull/4859

### Chore

- ci: install git in stock-Ubuntu baseline job by @escapedcat in https://github.com/conventional-changelog/commitlint/pull/4847

**Full Changelog**: https://github.com/conventional-changelog/commitlint/compare/v21.1.0...v21.2.0

</details>

### @nx/js (23.0.2 → 23.1.0)

Sources: [repository](https://github.com/nrwl/nx) · [23.1.0](https://github.com/nrwl/nx/releases/tag/23.1.0)

_fixture: changelog body truncated_
