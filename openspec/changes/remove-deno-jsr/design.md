# Design

## Context

See proposal.md (Why). Current Deno/JSR surface, as found in the repo:

- **Config**: the root `deno.json` (a Deno workspace over 6 packages, `unstable: ["sloppy-imports"]`, `fmt` excluding everything) and six per-package `deno.json` files (`name`/`version`/`exports: ./src/index.ts`, some with `compilerOptions.lib` and `npm:` import maps). None of them is in any package's `files`, so they never reach npm tarballs.
- **Toolchain**: `.dvmrc` (`2.9.3`), `engines.deno`, and a `devEngines.runtime` entry `{name: deno, onFail: download}`. Because of that entry, `pnpm-lock.yaml` carries `deno@runtime:2.9.3` as a root devDependency, so every `pnpm install` downloads a Deno binary.
- **Release**: `release-please-config.json` bumps `deno.json#version` through `extra-files` (type `json`). `release-please.yml#publish` runs `denoland/setup-deno`, then a `Publish packages to JSR` step (Nx graph ordering, a `jsr.io/<pkg>/<ver>_meta.json` idempotency probe, `deno publish --unstable-sloppy-imports`), then npm.
- **Dead scripts**: `jsr:sync-version` runs `tools/sync-jsr-version.js`, which was deleted on 2025-11-18. `react-{clean,hooks}:release` chain into it. `nx.json` has no `release` block; release-please is the only real release path.
- **Unrelated look-alikes**: `@deno/shim-deno` in the lockfile is a transitive dependency of `dax-sh`, not ours. The plugins' Deno handling is a product feature (see proposal, Out of scope).

## Goals / Non-Goals

**Goals:**

- Zero Deno/JSR references in monorepo infrastructure (root config, `packages/*`, CI, release config, top-level docs, OpenSpec project context), verifiable by grep.
- No change to npm artifacts, exports, peer deps or build output.

**Non-Goals:**

- Fixing unrelated staleness in the touched specs (for example the `is-even`/`is-odd` lists in `package-release`/`bundle-size-tracking`). Those blocks are copied verbatim.
- Rewriting historical `CHANGELOG.md` entries or archived changes.
- Changing source import style: extensionless imports keep working under tsdown/TS `bundler` resolution, and `allowImportingTsExtensions` predates and is independent of Deno.

## Decisions

1. **Delete `deno.json` outright; do not keep it for "local Deno compatibility".** Deno consumes npm packages natively (`npm:@m0n0lab/<pkg>`), so a `deno.json` without JSR publishing is pure upkeep (release-please bumps, JSON array reformatting). Alternative considered: keep `deno.json` files unpublished. Rejected: same maintenance cost, no consumer.

2. **Keep the `prettify-pr` job; update only its comment.** It was introduced for `deno.json` arrays, but a JSON round-trip check shows all four `claude-plugins/*/.claude-plugin/plugin.json` files still get reformatted by release-please, while every `package.json` and `marketplace.json` is stable. Alternative considered: drop the job. Rejected: plugin release PRs would fail `lint:oxfmt`.

3. **Remove the npm publish ordering logic together with the JSR step.** The Nx-graph ordering only existed for JSR. npm does not validate that dependencies exist at publish time, so the existing loop over `$PACKAGES` is enough. `permissions.id-token: write` stays for npm OIDC/provenance.

4. **Delete all four legacy `nx release` scripts, not just the `&& pnpm run jsr:sync-version` suffix.** Without a `release` block in `nx.json` they would version packages outside release-please and desync `.release-please-manifest.json`. The `:dry` variants have no remaining purpose. Alternative considered: strip only the JSR suffix. Rejected: it leaves a second, conflicting release path.

5. **Regenerate the lockfile with a plain `pnpm install` after editing `devEngines`/`engines`.** pnpm drops the `deno` importer entry and the `deno@runtime` package. `@deno/shim-deno` stays because `dax-sh` still needs it.

6. **Reconcile the in-flight `drizzle-neverthrow-package` change's text now.** Its delta (`specs/drizzle-neverthrow/spec.md`) would otherwise put a "published to JSR and npm" requirement into live specs when it is archived. That capability has no live spec yet, so this change cannot MODIFY it. Edit that change's proposal/design/spec/tasks wording to say npm only. Leave its checked tasks checked; the JSR part of task 1.1 is superseded and gets a note.

7. **Fix the `package-release` Purpose at archive time.** Its Purpose reads "dual publishing to npm and JSR", and deltas cannot change Purpose. Per project practice, update it directly in `openspec/specs/package-release/spec.md` when syncing this change, not while it is in flight.

8. **Commit granularity.** Infra goes as `ci:`/`build:`/`chore:`. Package README edits go as `docs(<pkg>):`. `docs` is a visible changelog section, so release-please may cut patch releases for the touched packages. That is acceptable: it refreshes the npm READMEs, which otherwise keep advertising `npx jsr add`.

## Risks / Trade-offs

- [7 package versions are released in git but not on npm (see proposal, Why)] → after merge, `workflow_dispatch` the release workflow on `main` with `packages=react-clean,react-hooks,ts-configs,ts-types,http-client,solid-clean,drizzle-neverthrow`. The npm loop skips versions that are already published, so a re-run is safe.
- [`drizzle-neverthrow` is a first-ever npm publish; npm Trusted Publishing (OIDC) is set up in an existing package's settings, so the tokenless CI publish may be rejected] → the npm loop runs under `bash -e`, so one failure aborts the remaining packages. Dispatch the other six first. If `drizzle-neverthrow` is rejected, bootstrap it with a local `pnpm publish --access public` from a clean build, configure its trusted publisher, and re-dispatch.
- [The Nx-graph ordering in the JSR step is already broken: the 2026-10-17 log shows `Publishing to JSR in dependency order: plugin-expo-developer`, so every package fell through to the "standalone" path] → moot once the step is deleted. Recorded here so nobody ports that jq into the npm step.
- [A release PR is open when this lands on `main` and still bumps `deno.json`] → release-please rebuilds the PR from the new config on its next run. If a stale branch persists, close it and let release-please recreate it.
- [JSR consumers are left on frozen versions without notice] → a manual jsr.io archive step (tasks) points them to npm.
- [Open Renovate PRs touch `deno.json` imports or `.dvmrc`] → they become obsolete. Close them after merge.
- [The experiments plugin's engine scan of this repo stops reporting a Deno surface] → expected. Verified that no plugin script or test reads this repo's `.dvmrc`/`deno.json`; only skill docs mention them generically.
- [Rollback re-adds `deno.json` files at stale versions] → a `git revert` restores the files. The next release-please run re-bumps them and the JSR step's `_meta.json` probe keeps publishing idempotent.

## Migration Plan

1. Implement on `feature/remove-deno` → PR to `develop` → normal (non-squash) merge to `main`.
2. Once on `main`, dispatch the release workflow to publish the 7 stuck versions (order and bootstrap per Risks). Confirm the `publish` job log has no Deno/JSR steps and that `npm view @m0n0lab/<pkg> version` matches `.release-please-manifest.json`.
3. Manually archive the 5 JSR packages on jsr.io (package settings), with a note pointing to npm.
4. Rollback: revert the merge commit. JSR publishing resumes on the next release.
