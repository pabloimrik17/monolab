# Tasks

One pull request (agentic-task-6c2p.59). No task affects package exports, so no attw validation applies.

## 1. Pin the tools

- [x] 1.1 Add `zizmor = "1.32.0"`, `"aqua:rhysd/actionlint" = "1.7.12"` and `shellcheck = "0.11.0"` to `mise.toml` `[tools]`, run `mise lock`. Verify:
    - `mise.lock` holds checksums for `aqua:zizmorcore/zizmor`, `aqua:rhysd/actionlint` and `aqua:koalaman/shellcheck` on linux-x64, macos-arm64 and macos-x64.
    - `mise x -- zizmor --version`, `mise x -- actionlint -version` and `mise x -- shellcheck --version` print 1.32.0, 1.7.12 and 0.11.0.

## 2. Fix the baseline

- [x] 2.1 Set `persist-credentials: false` on the checkouts of the `ci.yml` lint, tests and build jobs, `renovate-config-validator.yml` and `pullfrog.yml`. In `pullfrog.yml`, add a comment that it is not part of the generated file. Verify `mise x -- zizmor --offline .github/workflows/ci.yml .github/workflows/renovate-config-validator.yml .github/workflows/pullfrog.yml` reports no `artipacked` finding.
- [x] 2.2 Apply the `release-please.yml` fixes from design.md:
    - Top-level `permissions: {}`.
    - `contents`, `issues` and `pull-requests: write` on the `release-please` job.
    - `persist-credentials: false` on `publish` and explicit `persist-credentials: true` on `prettify-pr`.
    - `PACKAGES` from `env` in the build-and-publish and summary steps.
    - Quoted `"$GITHUB_OUTPUT"` and `"$PKG_DIR"`.
    - The summary lines grouped into one `>> "$GITHUB_STEP_SUMMARY"`.

    Verify:
    - `mise x -- zizmor --offline .github/workflows/release-please.yml` and `mise x -- actionlint -pyflakes= .github/workflows/release-please.yml` (shellcheck on) report nothing.
    - Every job's permissions match the table in design.md.
- [x] 2.3 Change `cve` to `uses: $/.github/workflows/cve-scan.yml` and add `.github/actionlint.yaml` with the path-scoped ignore and reason comment from design.md, using 4-space YAML indent. Verify:
    - `mise x -- actionlint -pyflakes=` run from the repository root passes.
    - A scratch copy of `ci.yml` with an invalid `shell:` still fails it.
    - `pnpm run lint:oxfmt` passes.
- [x] 2.4 Verify the whole baseline is clear from the repository root:
    - `mise x -- actionlint -pyflakes=` reports nothing.
    - `GH_TOKEN=$(gh auth token) mise x -- zizmor .` reports no findings.
    - No `# zizmor: ignore` comment exists, and `.github/zizmor.yml` holds only its comment and `rules: {}`.
- [ ] 2.5 Add `.github/zizmor.yml` with a short comment and `rules: {}`, 4-space YAML indent. The comment says:
    - zizmor reads this file.
    - It is kept with zizmor's defaults on purpose, so there is one place to change one.
    - An Accepted finding is never recorded here, but on its line with `# zizmor: ignore[<audit>] <reason>`.

    Verify:
    - `GH_TOKEN=$(gh auth token) mise x -- zizmor .` and `mise x -- zizmor --offline .` still report no findings.
    - zizmor discovers the file for `.` and for a single workflow file given as an absolute path, as the hook passes it. Check zizmor's verbose or debug output.

## 3. Hooks

- [x] 3.1 Add `WORKFLOW_FILES` and the `mise x -- zizmor --offline` and `mise x -- actionlint -shellcheck= -pyflakes=` `forStaged` entries to the parallel last step of `lint-staged.config.ts` (design.md). Verify on a throwaway branch:
    - Staging a workflow edit with an invalid `runs-on` expression blocks the commit with the actionlint finding.
    - Staging `uses: actions/checkout@v4` blocks it with an `unpinned-uses` finding.
    - Staging only an unquoted variable in a `run:` script lets the commit through.
    - A commit with no workflow file runs neither tool.
    - With `GH_TOKEN` set, zizmor and actionlint add under 1 second to a workflow commit and zizmor makes no network calls.

    Delete the throwaway branch and commits afterwards.

## 4. CI

- [x] 4.1 Add the `workflows` job to `ci.yml` as in design.md:
    - `contents: read`.
    - The checkout and `jdx/mise-action` SHAs and `version` the `secrets` job uses.
    - `install_args: zizmor aqua:rhysd/actionlint shellcheck`.
    - `actionlint -pyflakes=`, then `zizmor --format github .` with `if: ${{ !cancelled() }}` and `GH_TOKEN: ${{ github.token }}`.

    Set `main.needs` to `[lint, tests, build, cve, secrets, workflows]` and add its result line. Verify:
    - Every `uses:` is SHA-pinned with a `# vX.Y.Z` comment.
    - `mise x -- actionlint -pyflakes=` and `mise x -- zizmor --offline .` still pass.
    - `pnpm run lint:oxfmt` passes.

## 5. Documentation

- [x] 5.1 Add actionlint and zizmor paragraphs to README's External tools section. Cover:
    - The manual commands, run from the repository root: `mise x -- actionlint -pyflakes=` and `GH_TOKEN=$(gh auth token) mise x -- zizmor .`, or `--offline`.
    - That the hook skips shellcheck and zizmor's online audits, which CI runs.
    - How to record an Accepted finding with each tool, as in design.md.
    - That every other finding is fixed.

    Verify every documented command runs as written and `pnpm nx run @m0n0lab/source:lint:markdownlint` passes.

## 6. Integration

- [x] 6.1 Run `pnpm exec openspec validate add-workflow-lint-and-audit --strict` and verify it passes.
- [ ] 6.2 Open the pull request against `develop`. Verify:
    - The `workflows` job starts in parallel with lint, tests, build, cve and secrets, with both its steps green.
    - `cve` runs through `$/` with the CVE gate green.
    - `main` waits for all six jobs and is green.
- [ ] 6.3 After the merge, verify the next develop→main release:
    - release-please opens or updates the release PR.
    - `prettify-pr` pushes its formatting commit when one is needed.
    - `publish` publishes the released packages.
    - `back-merge` opens the main→develop PR.

## Workflow follow-up

- Fleet template, once merged: write the `mise.toml` lines, the lint-staged entries, the `workflows` job, `.github/actionlint.yaml`, `.github/zizmor.yml` and the Accepted finding policy into the notes of agentic-task-6c2p.11–.17 and .20 (hooks) and .21–.27 and .30 (CI). Each repository measures its own baseline.
- datf (agentic-task-6c2p.18 and .28): bump zizmor 1.30.1 → 1.32.0, add shellcheck for CI only, add the `workflows` job, and switch same-repository references to `$/`.
- When actionlint, or its replacement from tool review agentic-task-6c2p.63, accepts `$/` and ships the darwin shellcheck fix: remove the `.github/actionlint.yaml` entry and drop `-shellcheck=` from the hook.
