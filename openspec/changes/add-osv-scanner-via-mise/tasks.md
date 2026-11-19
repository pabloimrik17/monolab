# Tasks

Tasks are split by pull request in a gh-stack. Groups 1–5 are PR1 (agentic-task-6c2p.55, gate report-only); groups 6–7 are PR2 (agentic-task-6c2p.56, cleanup and blocking). No task affects package exports, so no attw validation applies.

## 1. External tools with mise (PR1)

- [x] 1.1 Pick the osv-scanner version (newest release ≥ 14 days old; 2.7.1 from 2026-11-23) and write `mise.toml` with `min_version = "2026.10.0"`, `[tools] osv-scanner` and `[settings] lockfile_platforms = ["linux-x64", "macos-arm64", "macos-x64"]`; verify `mise.toml` declares neither `node` nor `pnpm`
- [x] 1.2 Generate `mise.lock` with `mise lock` and verify it holds a checksum for osv-scanner on all three platforms
- [x] 1.3 Verify on a fresh worktree that `mise install` then `mise x -- osv-scanner --version` prints the pinned version with no trust prompt
- [x] 1.4 Add the "External tools" subsection to README's Development Setup (install mise, pins in `mise.toml`/`mise.lock`, hooks install on first use, manual `mise x -- osv-scanner scan source -L pnpm-lock.yaml --config osv-scanner.toml`) and verify the documented commands run as written and `pnpm nx run @m0n0lab/source:lint:markdownlint` passes

## 2. Gate configuration (PR1)

- [x] 2.1 Create `osv-scanner.toml` with only the policy header (threshold, Accepted advisory fields, expiry field for the pinned version, 90-day limit, owner) and verify `mise x -- osv-scanner scan source -L pnpm-lock.yaml --config osv-scanner.toml` accepts it
- [x] 2.2 Write `.github/osv-gate.jq` (blocks on `max_severity` ≥ 7.0; an unscored group blocks unless all its advisories are `LOW`/`MODERATE`) and verify with throwaway fixtures that 9.8 and 7.0 fail, 5.3 passes, unscored `MODERATE` passes and unscored unlabelled fails, then run it against today's real scan output and confirm it flags the 27 packages counted on 2026-11-19 or their current equivalent

## 3. CI workflow (PR1)

- [x] 3.1 Create `.github/workflows/cve-scan.yml` as a reusable workflow (`workflow_call`, `schedule` 17 7 * * * with `timezone: Europe/Madrid`, `workflow_dispatch`) with one job: SHA-pinned checkout, `jdx/mise-action` pinned to `90f833d396d0cc3674b631d2d225e306476c303a # v5.2.10` with `version` set to the newest mise ≥ 14 days old and no `sha256`; verify every `uses:` is SHA-pinned with a `# vX.Y.Z` comment
- [x] 3.2 Add the scan-scope step (pull requests scan only when the diff against the PR base SHA touches `pnpm-lock.yaml`, `osv-scanner.toml`, `mise.toml`, `mise.lock`, `.github/osv-gate.jq` or `cve-scan.yml`; push, schedule and dispatch always scan) and verify on PR1 itself, which touches those files, that the scan runs
- [x] 3.3 Add the scan steps: JSON scan accepting exit codes 0/1 only, `has("results")` check, per-finding `::error`/`::warning` annotations, a job summary table listing every finding (id, `package@version`, severity, blocks), the jq gate behind `CVE_GATE_MODE: report`; verify the PR1 run is green, its job summary lists every finding and it shows annotations up to GitHub's per-step limit
- [x] 3.4 Add the SARIF scan and the SHA-pinned `github/codeql-action/upload-sarif` step (`category: osv-scanner`, skipped for fork PRs) and verify the alerts appear under Security → Code scanning
- [x] 3.5 Add the `cve` job to `ci.yml` (`uses: ./.github/workflows/cve-scan.yml`, permissions `contents: read` and `security-events: write`) and set `main.needs` to `[lint, tests, build, cve]`; verify in the PR1 run that `cve` starts in parallel with the other jobs and `main` waits for it
- [x] 3.6 Verify the fail-closed paths on a throwaway branch or by local simulation: a scanner exit code other than 0/1 and a JSON without `results` both fail the step even with `CVE_GATE_MODE: report`
- [ ] 3.7 After PR1 merges, trigger `cve-scan.yml` with `workflow_dispatch` on `develop` (GitHub dispatches only workflows present on the default branch) and verify it runs alone (no lint, tests or build)

## 4. Pre-push hook (PR1)

- [x] 4.1 Create `.husky/pre-push` with the mise check, the `MISE_EXEC_AUTO_INSTALL`/`MISE_AUTO_INSTALL` exports and the lockfile-gated, report-only scan from design.md; verify a push with an unchanged lockfile does not scan, a push with a changed lockfile prints findings and still proceeds, and `PATH` without mise fails with the one-line hint

## 5. PR1 integration

- [x] 5.1 Run `openspec validate add-osv-scanner-via-mise --strict`, `pnpm run lint:oxfmt` and the Renovate config validator, and verify all pass
- [x] 5.2 Open PR1 against `develop` with gh-stack and verify CI is green with the `cve` job reporting findings and `main` green
- [ ] 5.3 Verify Renovate's dependency dashboard lists osv-scanner under the mise manager after PR1 merges, and that the osv-scanner pull request Renovate opened in the pilot repository updated `mise.lock`

## 6. Clear the findings (PR2)

- [ ] 6.1 Upgrade the direct dependencies that carry blocking advisories and add `pnpm.overrides` for transitive ones; verify after each batch with `mise x -- osv-scanner scan source -L pnpm-lock.yaml --config osv-scanner.toml --format json | jq -e -f .github/osv-gate.jq` and with the affected `nx affected -t lint test typecheck build`
- [ ] 6.2 Record every remaining blocking advisory that has no fixed version as an Accepted advisory (expiry ≤ 90 days, reason, `Owner: pfe`) and verify the jq gate passes locally

## 7. Make the gate blocking (PR2)

- [ ] 7.1 Set `CVE_GATE_MODE: block` in `cve-scan.yml` and verify the PR2 run is green with the gate blocking
- [ ] 7.2 Open PR2 stacked on PR1 with gh-stack and verify CI is green; after both merge, verify the next push run and the next 07:17 Europe/Madrid run on `develop` are green

## Workflow follow-up

- Archive this change after PR2 merges.
- Open one "osv-scanner via mise" task per fleet repository, copying this one.
- In the pilot repository, switch its pre-push osv-scanner step to report-only and drop the README trust paragraph (agentic-task-6c2p.18).
