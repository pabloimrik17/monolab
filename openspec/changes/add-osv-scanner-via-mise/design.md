# Design

## Context

- `ci.yml` runs `lint`, `tests` and `build` in parallel, then a `main` job that the `Protected develop` and `Protected main` rulesets require. Pull requests run the affected variant of each target, pushes run every project.
- `pnpm-lock.yaml` is the only lockfile, and pnpm 12 writes it as a multi-document YAML file. osv-scanner reads every document since 2.6.0.
- On 2026-11-19, osv-scanner 2.7.0 reported 240 advisory groups, 109 of them blocking under the threshold in the `cve-gate` spec. A gate that blocks from the first commit would turn CI red, hence the two pull requests (see Migration Plan).
- Hooks are husky scripts. Today only `pre-commit` and `commit-msg` exist.
- The repository is public, so code scanning SARIF uploads and Actions minutes are free.
- The scanner choice and its rejected alternatives are recorded in ADR 0014. They are not repeated here.

## Goals / Non-Goals

**Goals:**

- One place pins osv-scanner (`mise.toml` + `mise.lock`) for hooks and CI alike.
- The gate's blocking decision lives in one versioned filter file that CI uses.
- Switching the gate from report-only to blocking is a one-line change.

**Non-Goals:**

- gitleaks, zizmor, actionlint, moving knip to pre-push and the commitlint/branch-name CI backstop. Other tasks own them, and they extend this change's `mise.toml`, pre-push hook and CI.
- Ruleset changes. The gate rides on the existing required `main` check.
- Separating dev dependencies from shipped ones. No scanner does it correctly for pnpm ≥ 9 (ADR 0014).

## Decisions

### mise with a committed lock and a hard minimum

`mise.toml` holds `min_version = "2026.10.0"`, `[tools] osv-scanner = "<version>"` and `[settings] lockfile_platforms = ["linux-x64", "macos-arm64", "macos-x64"]`, and `mise lock` writes `mise.lock`. The pinned version is the newest osv-scanner release that is at least 14 days old on the day of implementation, matching the repository's `minimumReleaseAge`: 2.7.1 from 2026-11-23, 2.7.0 before that.

- Alternative: download in CI with curl and `sha256sum -c`. Rejected, because it leaves the version in two places (workflow and hooks) and Renovate cannot bump a checksum written inline.
- Alternative: no lock. Rejected: without it nothing verifies checksums.

mise ≥ 2026.9 trusts a config automatically when it runs `mise x` or `mise install`, and shares that trust across git worktrees. So nothing in the repository handles trust and nothing in `prepare` installs tools: the hook installs osv-scanner on first use.

### CI installs mise through `jdx/mise-action` with only `version` pinned

The action is pinned by commit SHA (v5.2.10, `90f833d396d0cc3674b631d2d225e306476c303a`). Its `version` input is the newest mise release at least 14 days old, and it is at least `min_version`. Leaving `sha256` unset keeps the action's sigstore check of the mise binary, which a `sha256` input would switch off. The action adds `--locked` itself when `mise.lock` exists, so a stale lock fails the job. Renovate's github-actions manager already bumps this `version` input, so no custom manager is needed.

### Renovate needs no configuration

The mise manager is on by default, because `renovate.json` sets no `enabledManagers`. It runs `mise lock <tool>` as an artifact update, which refreshes every platform already in the lock. It takes release dates from `github-tags`, so `minimumReleaseAge` and the update-type schedules apply as they are.

### The gate is a reusable workflow called as a `cve` job

`.github/workflows/cve-scan.yml` holds one job and triggers on `workflow_call`, on `schedule` (`cron: "17 7 * * *"`, `timezone: "Europe/Madrid"`) and on `workflow_dispatch`. `ci.yml` adds `cve: uses: ./.github/workflows/cve-scan.yml` with job permissions `contents: read` and `security-events: write`. `main.needs` becomes `[lint, tests, build, cve]`.

- The gate therefore blocks merges through the check the rulesets already require.
- The daily run executes this workflow alone, not the rest of CI.
- The local `./` reference has no SHA to pin, because it resolves to the same commit. The pinning spec covers third-party and `actions/*` actions.
- Alternative: a standalone workflow added as a second required check. Rejected: it means a settings change outside code review, and it goes against the single stable check in `ci-job-layout`.
- No `concurrency` block is needed. Nothing cancels in-progress runs, so the scheduled run and push runs never cancel each other.

### Scan scope

The job's first step decides whether to scan:

- **`pull_request`:** fetch `github.event.pull_request.base.sha` at depth 1. Scan only if `git diff --name-only <base> HEAD` touches `pnpm-lock.yaml`, `osv-scanner.toml`, `mise.toml`, `mise.lock`, `.github/osv-gate.jq` or `.github/workflows/cve-scan.yml`.
- **`push`, `schedule` and `workflow_dispatch`:** always scan.
- **Not scanning:** every later step is skipped and the job succeeds, so `main` stays green. This is why the filter is a step and not `on.pull_request.paths`: a workflow-level `paths` filter would leave the required check pending.

Push runs come after a merge, so they block nothing. They keep `develop` red until someone fixes the advisory, and they refresh `develop`'s code scanning alerts, which is the base that pull request alerts are compared with. `nx-set-shas` is unaffected, because pushes already run every project.

### Gate mechanics

1. Run `osv-scanner scan source -L pnpm-lock.yaml --config osv-scanner.toml --format json > osv.json`, capturing the exit code. Exit codes 0 and 1 continue; any other fails the job.
2. `jq -e 'has("results")' osv.json` fails the job on output it cannot read.
3. One jq expression prints each finding as `::error` when it blocks or `::warning` otherwise, with id, `package@version` and `max_severity`. Another writes every finding to `$GITHUB_STEP_SUMMARY` as a Markdown table (id, `package@version`, severity, blocks). Both share the severity rule with the filter file. GitHub shows only about 10 error and 10 warning annotations per step and drops the rest silently, so the summary is the complete list in the run itself.
4. `.github/osv-gate.jq` encodes the threshold:
    - a group blocks when `max_severity` ≥ 7.0;
    - an unscored group blocks unless every advisory in it is labelled `LOW` or `MODERATE` in `database_specific.severity`.
    `jq -e -f .github/osv-gate.jq osv.json` decides.
5. A workflow-level `CVE_GATE_MODE` env, `report` in PR1 and `block` in PR2, makes step 4 print instead of fail. Steps 1 and 2 fail closed in both modes.
6. A second scan writes `--format sarif`, and `github/codeql-action/upload-sarif` (pinned by SHA) uploads it with `category: osv-scanner`. Upload is skipped for pull requests from forks, whose token cannot write security events.

The SARIF run is a second scan, about 5 s against OSV.dev, rather than a JSON-to-SARIF conversion that we would have to maintain. Accepted advisories are absent from both outputs, so their alerts close.

### Pre-push hook

`.husky/pre-push` holds the commands inline, with no script that parses stdin:

```sh
command -v mise >/dev/null 2>&1 || { echo "pre-push: install mise (https://mise.jdx.dev/getting-started.html) to run osv-scanner"; exit 1; }
# With auto-install off, mise x would run any same-named binary on PATH instead of the pinned one.
export MISE_EXEC_AUTO_INSTALL=true MISE_AUTO_INSTALL=true
git diff --quiet origin/develop...HEAD -- pnpm-lock.yaml \
  || mise x -- osv-scanner scan source -L pnpm-lock.yaml --config osv-scanner.toml \
  || echo "osv-scanner: reported only; CI blocks on CVSS >= 7.0"
```

The three-dot diff compares with the merge base, so a branch that is only behind `develop` does not scan.

### Accepted advisory format

`osv-scanner.toml` starts with a header that states the policy. Each entry is `[[IgnoredVulns]]` with `id`, the expiry field and `reason`, which ends with `Owner: pfe`. The expiry field is `effectiveUntil` when the pinned osv-scanner is ≥ 2.7.1, where `ignoreUntil` is deprecated, and `ignoreUntil` otherwise. Review enforces the 90-day limit.

## Risks / Trade-offs

- [OSV.dev outage or rate limit] → The scan errors and the gate fails closed on lockfile pull requests, pushes and the daily run. Re-run the job. An offline database is out of scope.
- [Renovate's `mise.lock` regeneration not yet seen working on the hosted app] → The osv-scanner pull request Renovate opens in the pilot repository is the evidence. If the lock arrives stale, the `--locked` install fails that pull request visibly; fix it with `mise lock` on the branch.
- [Dev-tooling advisories block like runtime ones] → An Accepted advisory with a reason and a review date (ADR 0014).
- [About 240 code scanning alerts on the first upload] → Expected. They fall as PR2 lands, and later uploads close the fixed ones.
- [`timezone` in `on.schedule` is new (March 2026)] → When actionlint arrives, check that it accepts the key.
- [An unrelated pull request merges while `develop` is red] → Intended. Push and daily runs keep the failure visible until it is fixed.

## Migration Plan

Two stacked pull requests, managed with gh-stack:

1. **PR1** (base `develop`): everything in this change with `CVE_GATE_MODE: report`. CI is green, and the run lists the current findings in its job summary, as annotations and as alerts.
2. **PR2** (on PR1): upgrade direct dependencies, add `pnpm.overrides` for transitive ones, accept the advisories that have no fix, and set `CVE_GATE_MODE: block`. Its green CI is the proof that the lockfile is clean. Archive the change after PR2 merges.

Rollback: set `CVE_GATE_MODE: report` (one line), or revert PR1.

## Open Questions

- The exact osv-scanner, mise and `upload-sarif` versions are chosen at implementation, each the newest that is at least 14 days old.
