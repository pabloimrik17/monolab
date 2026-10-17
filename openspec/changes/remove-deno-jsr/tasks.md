# Tasks

No task changes package exports: `deno.json` was never in any package's `files`. `build:check-exports` (attw) runs in 5.2 as a sanity check only.

## 1. Deno config and toolchain

- [x] 1.1 Delete the root `deno.json` and `packages/{drizzle-neverthrow,http-client,react-clean,react-hooks,ts-configs,ts-types}/deno.json`. Verify `git ls-files deno.json 'packages/*/deno.json'` prints nothing.
- [x] 1.2 Delete `.dvmrc`. In root `package.json`, remove `engines.deno` and the `deno` entry of `devEngines.runtime` (keep the `node` entry). Verify `jq '.engines.deno, [.devEngines.runtime[] | select(.name=="deno")]' package.json` prints `null` and `[]`.
- [x] 1.3 In root `package.json` `scripts`, remove `jsr:sync-version`, `react-clean:release`, `react-clean:release:dry`, `react-hooks:release` and `react-hooks:release:dry` (design decision 4). Verify `git grep -n -E "jsr:sync|react-(clean|hooks):release" -- package.json` prints nothing.
- [x] 1.4 Run a single `pnpm install` to regenerate `pnpm-lock.yaml` (parallel workers: never restore the lockfile by hand). Verify `command grep -c "deno@runtime" pnpm-lock.yaml` is `0`, the root importer has no `deno:` entry, and `@deno/shim-deno` is still present via `dax-sh` (expected).

## 2. Release pipeline

- [x] 2.1 In `release-please-config.json`, remove the `deno.json` `extra-files` entry from the 6 packages. Delete the `extra-files` key wherever it becomes empty. Verify `jq '[.packages[]["extra-files"][]? | select((.path? // .) == "deno.json")] | length' release-please-config.json` is `0` and `pnpm exec oxfmt --check release-please-config.json` passes.
- [x] 2.2 In `.github/workflows/release-please.yml` `publish` job, delete the `Setup Deno` and `Publish packages to JSR` steps. Keep `permissions.id-token: write` and the npm step unchanged. Verify `command grep -n -i -E "deno|jsr" .github/workflows/release-please.yml` prints nothing (after 2.3) and `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/release-please.yml'))"` succeeds.
- [x] 2.3 Reword the `prettify-pr` comment block: its example (`["ES2023", "DOM"]`) came from `deno.json`. Cite the `.claude-plugin/plugin.json` arrays that still need re-formatting (design decision 2). Verify the comment names no Deno file and the job's `if:`/steps are byte-identical to before (`git diff` shows comment-only hunks in that job).

## 3. Documentation

- [x] 3.1 Root `README.md`:
    - Published Packages: drop the JSR links and `npx jsr add` blocks.
    - Release Process: How It Works step 4 → npm only; Release PR → drop "`jsr.json` versions"; rewrite Publishing Workflow as npm-only (drop the JSR step, the "JSR runs first" and "Both npm and JSR use OIDC" notes); Workspace Protocol → drop the "Publishing to JSR" bullet; delete the Dependency Order section.
    - Adding a New Package: delete step 3 "Create deno.json"; step 4 → no `extra-files`; renumber.
    - Manual Recovery: delete "Failed JSR Publish" and "Version Mismatch Recovery"; reword "Failed npm Publish", "Complete Publish Failure" and "Rollback" for npm only.

    Verify `command grep -n -i -w -E "deno|jsr" README.md` prints nothing and `pnpm nx run @m0n0lab/source:lint:markdownlint` passes.
- [x] 3.2 `RELEASE.md` line 5: "npm/JSR packages" → "npm packages". Verify with `command grep -n -i -w jsr RELEASE.md` (no output).
- [x] 3.3 Package READMEs: remove the `### JSR` / `npx jsr add` blocks from `packages/{http-client,react-clean,react-hooks,ts-configs,ts-types,drizzle-neverthrow}/README.md`. In `packages/ts-configs/README.md`, reword "npm/JSR" (~L131) and "JSR-published packages" (~L161) to npm. Verify `command grep -n -i -w -E "deno|jsr" packages/*/README.md` prints nothing and markdownlint passes.
- [x] 3.4 `packages/ts-configs/tsconfig.node.lib.json` comment: "(JSR, npm)" → "(npm)". Comment only, no option change. Verify `git diff --stat` shows a 1-line change and `pnpm nx run @m0n0lab/ts-configs:lint:oxfmt` passes.
- [x] 3.5 `openspec/project.md` (L4, L52, L166, L179, L216, L238-240) and the `openspec/config.yaml` `context` line: describe npm-only publishing; drop the JSR registry notes. Verify `command grep -n -i -w jsr openspec/project.md openspec/config.yaml` prints nothing and `openspec list --json` still parses the config.
- [x] 3.6 Reconcile the in-flight `drizzle-neverthrow-package` change (design decision 6): edit `proposal.md` L7, `design.md` L11 and `specs/drizzle-neverthrow/spec.md` L25 to "npm only". Append "(JSR part superseded by `remove-deno-jsr`)" to its checked task 1.1. Do not uncheck anything. Verify `command grep -n -w JSR openspec/changes/drizzle-neverthrow-package -r` shows only that note, and `openspec validate drizzle-neverthrow-package` passes.

## 4. Commits

- [ ] 4.1 Commit in conventional units (design decision 8): `build:` (deno.json/.dvmrc/engines/lockfile/scripts), `ci(release):` (workflow + release-please config), `docs:` (root docs, openspec context), `docs(<pkg>):` per package README. Verify `git log --oneline develop..HEAD` shows only conventional subjects and husky/commitlint accepted each commit (no `--no-verify` on code commits).

## 5. Integration verification

- [ ] 5.1 Repo-wide sweep: run `git grep -n -i -w -E "deno|jsr" -- . ':!pnpm-lock.yaml' ':!**/CHANGELOG.md' ':!openspec/changes/archive/**' ':!openspec/changes/remove-deno-jsr/**' ':!openspec/specs/**' ':!claude-plugins/**' ':!.agents/**' ':!.opencode/**'`. Verify the only hits are the allowed ones: `implement-ky-http-client` (ky runtime-compat list) and the drizzle superseded note.
- [ ] 5.2 Run `pnpm install --frozen-lockfile`, then `pnpm nx run-many -t build build:check-exports typecheck test:unit -p @m0n0lab/drizzle-neverthrow @m0n0lab/http-client @m0n0lab/react-clean @m0n0lab/react-hooks @m0n0lab/ts-configs @m0n0lab/ts-types` (targets a project lacks are skipped), then `pnpm run lint:oxfmt`. Verify all pass.
- [ ] 5.3 Run `pnpm pack --dry-run` in `packages/react-clean` and `packages/ts-types`. Verify the tarball file list matches `files` and contains no `deno.json` (npm artifacts unchanged).
- [ ] 5.4 Run `openspec validate remove-deno-jsr --strict`. Verify it is valid.

## 6. Post-merge release recovery (manual, after the change is on `main`)

- [ ] 6.1 `gh workflow run release-please.yml --ref main -f packages=react-clean,react-hooks,ts-configs,ts-types,http-client,solid-clean`. Verify the run is green, its log has no Deno/JSR step, and `npm view @m0n0lab/<pkg> version` matches `.release-please-manifest.json` for all six.
- [ ] 6.2 Publish `drizzle-neverthrow` (first-ever npm publish): dispatch with `-f packages=drizzle-neverthrow`. If OIDC rejects it, bootstrap with a local `pnpm nx run @m0n0lab/drizzle-neverthrow:build` + `pnpm publish --access public`, then configure its npm trusted publisher. Verify `npm view @m0n0lab/drizzle-neverthrow version` is `1.0.0`.
- [ ] 6.3 On jsr.io, archive `@m0n0lab/{http-client,react-clean,react-hooks,ts-configs,ts-types}` with a note pointing to the npm package. Verify each jsr.io package page shows the archived state.

## Workflow follow-up

- At archive sync, edit the `package-release` live spec Purpose ("dual publishing to npm and JSR" → npm only) directly; deltas don't cover Purpose (design decision 7).
- Archive `remove-deno-jsr` after the PR is merged and group 6 is done.
