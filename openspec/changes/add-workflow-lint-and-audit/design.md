# Design

## Context

- `add-osv-scanner-via-mise` and `add-gitleaks-secret-scan` (both archived on 2026-11-22) set up the base:
    - `mise.toml` and `mise.lock` (linux-x64, macos-arm64, macos-x64), with `min_version = "2026.10.0"`.
    - `.husky/pre-commit`: mise check, `MISE_EXEC_AUTO_INSTALL`/`MISE_AUTO_INSTALL` exports, `validate-branch-name`, `lint-staged --hide-all`, then gitleaks.
    - The `secrets` job in `ci.yml`: `actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1` and `jdx/mise-action@90f833d396d0cc3674b631d2d225e306476c303a # v5.2.10` with `version: 2026.11.2` and `install_args`.
- The five workflows:
    - `ci.yml` and `cve-scan.yml` (reusable, called by `cve`).
    - `pullfrog.yml`: generated, "do not edit except where indicated". It already has one marked local addition.
    - `release-please.yml`: runs only on pushes to `main`.
    - `renovate-config-validator.yml`.
- No composite action or `dependabot.yml` exists.
- Baseline, measured on 2026-11-22. In every case below, the findings are the same on a clean clone and the run takes under a second:
    - **actionlint 1.7.12, without shellcheck:** 0 findings.
    - **actionlint 1.7.12, with shellcheck 0.11.0:** 7 findings, all in `release-please.yml`.
        - 6 × SC2086 at lines 120, 135 and 175.
        - 1 × SC2129 at line 175.
    - **zizmor 1.32.0, regular persona:** 14 findings, the same offline and online. 61 more are suppressed by the persona. Offline the run takes 0.3 s, online about 4 s.
        - 7 × `artipacked`, one per checkout without `persist-credentials: false`.
        - 4 × `excessive-permissions`: the top-level writes of `release-please.yml`.
        - 2 × `template-injection`, low confidence: `steps.released-packages.outputs.packages` at lines 137 and 179.
        - 1 × `self-repository`: `cve: uses: ./.github/workflows/cve-scan.yml`.
- The datf pilot (daily-agentic-task-force #42) set the hook template: lint-staged entries `mise x -- zizmor --offline` and `mise x -- actionlint -shellcheck= -pyflakes=`. It has no CI step.
- The state of actionlint upstream:
    - No release since 1.7.12 (2026-03-30).
    - Support for `$/` (rhysd/actionlint#732) and the fix for the darwin shellcheck deadlock (rhysd/actionlint#651, merged 2026-04-19) are both unreleased.
    - An open issue asking for a release calls the repository dead.
- pnpm runs no dependency build scripts here: `allowBuilds` is `false` for every entry, with `strictDepBuilds: true`.

## Goals / Non-Goals

**Goals:**

- Hooks and CI run the same pinned tools with the same repository config.
- The current workflows pass with no Workflow audit Accepted finding and one Workflow lint Accepted finding.
- The setup is a template the fleet can copy. Only the baseline fixes differ per repository.

**Non-Goals:**

- SARIF upload, a scheduled scan, and the pedantic or auditor personas.
- Moving knip to pre-push and the detached-HEAD branch check (`agentic-task-6c2p.19`), and the commitlint/branch-name CI backstop (`agentic-task-6c2p.29`).
- Replacing actionlint. Tool review `agentic-task-6c2p.63` covers that.

## Decisions

### Tools and backends

```toml
[tools]
gitleaks = "8.30.1"
osv-scanner = "2.7.0"
zizmor = "1.32.0"
"aqua:rhysd/actionlint" = "1.7.12"
shellcheck = "0.11.0"
```

- `zizmor` and `shellcheck` resolve through the mise registry to `aqua:zizmorcore/zizmor` and `aqua:koalaman/shellcheck`: release binaries with checksums.
- actionlint keeps an explicit `aqua:rhysd/actionlint`. Its registry short name has pointed at a fork before, and an explicit backend does not depend on the registry.
- Every version is at least 14 days old. Renovate's mise manager handles the `aqua:` backend.
- Alternative: zizmor through pipx or cargo. Rejected: it needs a Python or Rust toolchain, and gives no aqua checksum.
- Alternative: `zizmorcore/zizmor-action`. Rejected: CI installs every External tool through `jdx/mise-action` (`developer-toolchain`).

### Hook entries in lint-staged

In the parallel last step of `lint-staged.config.ts`:

```ts
const WORKFLOW_FILES = /^\.github\/workflows\/[^/]+\.ya?ml$/;
// …
...forStaged(WORKFLOW_FILES, "mise x -- zizmor --offline", filenames),
...forStaged(WORKFLOW_FILES, "mise x -- actionlint -shellcheck= -pyflakes=", filenames),
```

- lint-staged inherits the `MISE_*` exports from `.husky/pre-commit`, so `mise x` runs the pinned binary.
- `forStaged` passes absolute paths. actionlint finds `.github/actionlint.yaml` from the repository it is run in and matches its path globs relative to the working directory. The hook runs at the repository root, where the `$/` ignore matched absolute paths in a test on 2026-11-22. Run from outside the repository, the same ignore did not match.
- `-shellcheck=`: actionlint 1.7.12 deadlocks when it calls shellcheck on darwin arm64 (rhysd/actionlint#650). A test on this Intel Mac (4 `run:` steps, 46 KB) did not reproduce it.
    - Alternative: shellcheck in the hook as well. Rejected: on Apple Silicon a commit could hang, and a killed hook leaves the unstaged work in lint-staged's backup stash. Re-enable it once a fixed actionlint ships.
- `-pyflakes=`: no workflow runs Python, and an empty flag stops actionlint from using whatever pyflakes is on PATH.
- zizmor `--offline`: no network in the hook, even when `GH_TOKEN` is set.

### CI job `workflows`

```yaml
workflows:
    runs-on: ubuntu-latest
    permissions:
        contents: read
    steps:
        - name: Checkout code
          uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
              persist-credentials: false

        - name: Install mise and External tools
          uses: jdx/mise-action@90f833d396d0cc3674b631d2d225e306476c303a # v5.2.10
          with:
              version: 2026.11.2
              install_args: zizmor aqua:rhysd/actionlint shellcheck

        - name: Lint workflows
          run: actionlint -pyflakes=

        - name: Audit workflows
          if: ${{ !cancelled() }}
          env:
              GH_TOKEN: ${{ github.token }}
          run: zizmor --format github .
```

`main.needs` becomes `[lint, tests, build, cve, secrets, workflows]`. The `main` job prints one more result line.

- **Shellcheck:** the lint step finds shellcheck on the PATH that mise-action set up. On Linux, actionlint's shellcheck pipe only blocks above 64 KB per script, far beyond these workflows.
- **Step order:** the audit runs even when the lint step fails, so one push reports both.
- **Scope:** `zizmor .` collects workflows, composite actions and `dependabot.yml` anywhere in the repository. On a clean clone it takes 0.6 s and reports the same 14 findings as `.github/workflows`. The job installs no dependencies, so there is no `node_modules` to walk.
- **Online audits:** `GH_TOKEN` turns them on:
    - `impostor-commit`: a SHA from a fork network.
    - `known-vulnerable-actions`.
    - `ref-confusion`.
    - `ref-version-mismatch`: on 2026-11-22 it failed a pin commented `# v6.0.0` that points to v7.0.1.
- **Annotations:** `--format github` writes annotations and keeps zizmor's exit code (13 for a medium finding in a test).
- **No path filter and no cron:** an online audit can fail without any workflow change, when an advisory lands on a pinned action. Every pull request and push re-checks for that, which makes a schedule unnecessary. The job takes seconds, and the repository is public, so minutes are free.
- Alternative: steps in the `lint` job. Rejected: workflow feedback would wait for pnpm and Nx.
- Alternative: steps in the `secrets` job. Rejected: it needs a full clone, and two checks would share one result in `main`.

### No SARIF

The gate blocks, so `develop` stays at zero findings, and annotations show them on the pull request. The job keeps `contents: read` only. This reverses the epic's decision 11 (zizmor SARIF to the Security tab on public repositories) for this tool.

- Alternative: SARIF upload, as `cve-scan.yml` does. Rejected: it adds `security-events: write` and a second run, for a tab that stays empty.

### Fixing the baseline

| Finding | Fix |
| --- | --- |
| `artipacked` × 6 | `persist-credentials: false` on the checkouts of `ci.yml` lint, tests and build, `release-please.yml` publish, `renovate-config-validator.yml` and `pullfrog.yml` (with a comment saying it is not part of the generated file) |
| `artipacked` × 1 | `prettify-pr` sets `persist-credentials: true` explicitly, because it runs `git push` |
| `excessive-permissions` × 4 | `release-please.yml` top-level `permissions: {}`; the `release-please` job declares `contents`, `issues` and `pull-requests: write` (release PR, labels, tags). `prettify-pr`, `publish` and `back-merge` already declare theirs, so `id-token: write` stays on `publish` only |
| `template-injection` × 2 | `PACKAGES: ${{ steps.released-packages.outputs.packages }}` in the `env` of the build-and-publish and summary steps; the scripts read `"$PACKAGES"` |
| SC2086 × 6, SC2129 × 1 | Quote `"$GITHUB_OUTPUT"` and `"$PKG_DIR"`; group the summary lines as `{ …; } >> "$GITHUB_STEP_SUMMARY"`. `for PKG_DIR in $PACKAGES` keeps its word splitting on purpose, and shellcheck does not flag it |
| `self-repository` × 1 | `cve: uses: $/.github/workflows/cve-scan.yml`, plus the `.github/actionlint.yaml` entry below |

- **`prettify-pr`:** explicit `true` is zizmor's documented fix for a job that needs the credential for git.
    - Alternative: `persist-credentials: false`, passing the token only in the push URL. Rejected: it means more custom code for little gain. checkout v6 and later keep the credential under `$RUNNER_TEMP`, not in `.git/config`, and pnpm runs no dependency scripts here.
- **Treeless clones:** the lint, tests and build jobs fetch blobs lazily. On a public repository those fetches work without the credential, and `cve-scan.yml` already runs `git fetch` with `persist-credentials: false`.
- **`.github/actionlint.yaml`:**

```yaml
paths:
    .github/workflows/**/*.{yml,yaml}:
        ignore:
            # Accepted finding: actionlint 1.7.12 predates GitHub's self-repository syntax (uses: $/...). Remove once actionlint accepts it.
            - 'reusable workflow call "\$/[^"]+" at "uses" is not following the format'
```

On 2026-11-22 this entry let a `$/` call through and still reported an invalid `shell:` in the same file.

The cost: actionlint cannot follow `$/`, so it no longer checks `cve`'s inputs and secrets against `cve-scan.yml`'s `workflow_call`. Neither side declares any today.

`$/` (GitHub, 2026-07-30) resolves from the workflow's own commit. GitHub's pinning policies treat it as pinned, and they do not treat `./` as pinned. Security-minded repositories such as home-assistant/core, astral-sh/uv and rancher/rancher already use it for reusable workflows.

- Alternative: keep `./` with an inline `# zizmor: ignore[self-repository]`. Rejected in the grill: `$/` is the current form, and the actionlint cost is nil today.
- Alternative: disable the `self-repository` audit for the whole repository. Rejected: it would hide future `./` uses.

### Accepted findings and config files

There is one mechanism per tool, so each Accepted finding has one obvious place:

| Finding from | Recorded as |
| --- | --- |
| zizmor | `# zizmor: ignore[<audit>] <reason>` on the line. Verified to take a trailing reason |
| shellcheck | `# shellcheck disable=SC<code> # <reason>` in the script |
| any other actionlint check | `.github/actionlint.yaml`, scoped by path and message, because actionlint has no inline form |

There is no `.github/zizmor.yml`: the repository keeps no config that only restates a default. zizmor 1.32's default `unpinned-uses` policy already requires a hash pin for every action, `actions/*` included. If a later default relaxes that, the config is added then.

### Blocking from the first commit, default persona

Every finding blocks, whatever its severity: high, medium, low (labelled `help` in the text output) or informational. A run whose only finding is low exits 12.

- Alternative: block only from a severity threshold. Rejected after reviewing real examples of each level on 2026-11-22:
    - Low and informational findings take a line or two to fix.
    - zizmor rates the same finding differently offline and online. A v6+ checkout that keeps its credential is medium offline and low online, so a medium threshold would make the hook block what CI lets through.
    - The one new audit in recent releases, `self-repository` in 1.30, is low. Only a medium or high threshold would have let it through.

The pedantic and auditor personas add 61 findings, mostly low-confidence. They stay off.

## Risks / Trade-offs

- [`release-please.yml` changes cannot run in pull request CI] → The Workflow lint and the Workflow audit pass on them. A post-merge task watches the next develop→main release: release PR created, `prettify-pr` push, publish, back-merge. The rollback is a revert.
- [actionlint is unmaintained, so the `$/` entry and the hook's `-shellcheck=` may stay for a long time] → Tool review `agentic-task-6c2p.63`.
- [A zizmor release adds an audit the workflows fail, so Renovate's bump pull request goes red in every repository that copied the template] → mise.lock pins zizmor, so only that bump pull request fails, never `develop`. The fix, or an Accepted finding, goes into it, usually the same change in every repository.
    - Measured on 2026-11-22: one new audit since 1.26.
    - Renovate's minor schedule (the 8th, every 2 months) brings at most one zizmor minor per repository in that period.
- [A new advisory on a pinned action fails CI on an unrelated pull request] → That is intended: bump the action, in that pull request or a Renovate one.
- [Composite actions or `dependabot.yml` added later are audited only in CI, because the hook matches workflows only] → Acceptable. CI is the authority.
- [Regenerating `pullfrog.yml` drops `persist-credentials: false`] → The Workflow audit fails and prompts re-adding it.

## Migration Plan

One pull request against `develop`, with no data migration. Rollback is a revert of that pull request.

After the merge:

1. Verify the next release.
2. Write the fleet template into the notes of `agentic-task-6c2p.11`–`.17`, `.20`, `.21`–`.28` and `.30`. The datf notes (`.18`, `.28`) get the delta: zizmor 1.32.0, shellcheck in CI, the `workflows` job, and `$/`.
