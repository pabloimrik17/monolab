# Proposal

## Why

Dual publishing to npm + JSR forces the monorepo to keep a Deno toolchain alongside Node: a parallel `deno.json` per package, version sync through release-please `extra-files`, a Deno install in CI and on every `pnpm install`, and a JSR publish step that dictates release ordering. JSR adds no consumers worth that upkeep, and it now actively breaks releases. The 2026-10-17 release run (`39012931524`) failed in `Publish packages to JSR`, because `@m0n0lab/drizzle-neverthrow` doesn't exist on jsr.io. JSR runs before npm, so none of the 7 released packages reached npm: react-clean 4.0.0, react-hooks 1.4.2, ts-configs 1.3.0, ts-types 1.1.2, http-client 0.2.4, solid-clean 1.0.0, drizzle-neverthrow 1.0.0. Dropping JSR leaves a single registry (npm) and unblocks those publishes.

## What Changes

- **BREAKING (distribution)**: Stop publishing `@m0n0lab/*` packages to JSR. Already published JSR versions stay frozen; npm is the only registry from now on. npm artifacts are unchanged.
- Delete the root `deno.json` (Deno workspace + `sloppy-imports`) and the six per-package `deno.json` files (`drizzle-neverthrow`, `http-client`, `react-clean`, `react-hooks`, `ts-configs`, `ts-types`).
- Delete `.dvmrc`; drop `deno` from root `package.json` `engines` and `devEngines.runtime`. Regenerate `pnpm-lock.yaml`, so `pnpm install` stops downloading the `deno@runtime` binary.
- `release-please-config.json`: remove the `deno.json` `extra-files` entries from the six packages.
- `.github/workflows/release-please.yml`: remove the `Setup Deno` and `Publish packages to JSR` steps from the `publish` job. npm publishing and the `prettify-pr` job stay; `prettify-pr` is still needed for plugin `plugin.json` arrays.
- Root `package.json`: remove the dead `jsr:sync-version` script (it points to `tools/sync-jsr-version.js`, deleted 2025-11-18) and the legacy `react-clean:release`/`react-hooks:release` scripts plus their `:dry` variants. These are pre-release-please `nx release` flows that existed to keep `deno.json` in sync.
- Docs: remove JSR from the root `README.md` (badges, install, release process, new-package guide, recovery procedures), `RELEASE.md`, the per-package READMEs, the `ts-configs` README and the `tsconfig.node.lib.json` comment, `openspec/project.md` and the `openspec/config.yaml` context.
- Reconcile the in-flight `drizzle-neverthrow-package` change, whose delta still declares "published to JSR and npm".
- Manual, after merge to `main`: re-dispatch the release workflow to publish the 7 stuck versions to npm. Then archive the 5 packages that exist on jsr.io (`http-client`, `react-clean`, `react-hooks`, `ts-configs`, `ts-types`), pointing to npm. `drizzle-neverthrow` and `solid-clean` were never on JSR.

**Out of scope (kept as is)**: Deno support in the `experiments`/`commander` Claude plugins (scanning third-party Deno projects, `.dvmrc`/`setup-deno` engine surfaces, `engines.mjs`, the commander vocabulary). That is a plugin feature for other repos, not monorepo infrastructure. Also out of scope: historical `CHANGELOG.md` entries, archived OpenSpec changes, and the transitive `@deno/shim-deno` (pulled in by `dax-sh`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `package-release`: single-registry (npm) publishing; drop the JSR configuration and the `package.json`↔JSR version-sync scenarios.
- `types-package`: remove the `deno.json`/JSR requirement and scenarios; the README lists npm install only; the release-please entry has no `deno.json` extra-file.
- `http-client-package`: remove `deno.json` from the package layout and the JSR configuration scenario; `publishConfig`/README cover npm only.
- `bundle-size-tracking`: tracked packages are the npm-published ones (not "published to JSR").
- `typescript-config`: lib configs produce output suitable for publishing to npm (not JSR).

## Impact

- **Files**: `deno.json` ×7, `.dvmrc`, `package.json`, `pnpm-lock.yaml`, `release-please-config.json`, `.github/workflows/release-please.yml`, `README.md`, `RELEASE.md`, `packages/*/README.md` (6), `packages/ts-configs/tsconfig.node.lib.json` (comment only), `openspec/project.md`, `openspec/config.yaml`, `openspec/changes/drizzle-neverthrow-package/*`.
- **Exports / build output**: none. npm tarballs are unchanged (`deno.json` was never in `files`), so no attw re-validation is required beyond a sanity build.
- **CI**: the release workflow loses the Deno setup and the JSR publish; `id-token: write` stays for npm OIDC/provenance. Every `pnpm install` (CI + local) stops fetching Deno.
- **Consumers**: JSR users must switch to npm (`npm i @m0n0lab/<pkg>`); Deno users can still import `npm:@m0n0lab/<pkg>`.
- **Peer deps**: none changed.
