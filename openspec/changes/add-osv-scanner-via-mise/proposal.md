# Proposal

## Why

Nothing checks `pnpm-lock.yaml` for known vulnerabilities. Renovate's OSV alerts cover direct dependencies only. On 2026-11-19 osv-scanner found 240 advisory groups in the lockfile, 109 of them scored CVSS 7.0 or higher across 27 packages, and no check failed. The workspace also has no way to pin a command-line tool that does not ship on npm. A CVE scanner is the first such tool it needs.

## What Changes

- Add mise as the manager for External tools, the command-line programs a check runs that are not npm packages. `mise.toml` pins osv-scanner, and the committed `mise.lock` holds its checksums for linux-x64, macos-arm64 and macos-x64. `min_version` sets the lowest mise that can read them. The Node toolchain stays on `.nvmrc` and `packageManager`.
- Renovate keeps `mise.toml` and `mise.lock` current through its built-in mise manager, under the existing release-age and schedule rules. It also bumps the mise version that CI installs.
- Add a CVE gate:
    - osv-scanner scans `pnpm-lock.yaml` and blocks on advisories scored CVSS 7.0 or higher.
    - An unscored advisory also blocks, unless GitHub labels it Low or Moderate.
    - Everything below that is reported only.
    - It fails closed when the scanner errors or its output cannot be read.
- `osv-scanner.toml` is the only valve: an Accepted advisory carries a review date at most 90 days out, a reason and an owner.
- The gate runs as a new `cve` job inside the CI workflow, under the required `main` check.
    - Every push to `main`, `pre` and `develop` scans.
    - A pull request scans only when it changes the lockfile or the gate's own files, so an advisory it did not bring never blocks it.
    - The same workflow also scans every day at 07:17 Europe/Madrid and on demand.
- Every run lists all findings in its job summary, annotates them (GitHub shows only the first few per step) and uploads them as SARIF to the repository's code scanning.
- A new pre-push hook runs osv-scanner when the branch changes `pnpm-lock.yaml` against `origin/develop`. It only reports findings, and it fails only when mise is missing.
- README documents External tools under Development Setup.
- The change lands as two stacked pull requests:
    - PR1 adds everything above with the gate set to report only, so CI stays green.
    - PR2 clears the findings, accepts the advisories that have no fix, and switches the gate to blocking. Its green CI is the proof that the lockfile is clean.

## Capabilities

### New Capabilities

- `developer-toolchain`: how the workspace pins, installs and updates External tools, and keeps the Node toolchain separate from them.
- `cve-gate`: which lockfile is scanned, the blocking threshold, the Accepted advisory valve, where the gate runs (CI, schedule, pre-push) and how it reports.

### Modified Capabilities

- `ci-job-layout`: the CI workflow gains a fourth parallel check job, `cve`, and the `main` check depends on it.

## Impact

- New files: `mise.toml`, `mise.lock`, `osv-scanner.toml`, `.github/workflows/cve-scan.yml`, the gate's jq filter, `.husky/pre-push`.
- Changed files: `.github/workflows/ci.yml` (new `cve` job, `main.needs`), `README.md`. PR2 also changes `package.json` and `pnpm-lock.yaml` (upgrades and overrides).
- Developers need mise 2026.10.0 or newer to push. The hook installs osv-scanner on first use.
- New SHA-pinned actions: `jdx/mise-action` and `github/codeql-action/upload-sarif`.
- No new package, no change to exports and no change to peer dependencies.
- Decision record: [ADR 0014](../../../docs/adr/0014-osv-scanner-with-a-severity-filter-as-the-cve-gate.md). Terms: the Tooling section of the [Workspace glossary](../../../docs/GLOSSARY.md).
