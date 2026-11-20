# Proposal

## Why

Nothing in the workspace looks for credentials before they reach the public repository. GitHub's push protection blocks only provider tokens it recognises and only at the push itself, so a secret in a pattern it does not cover lands on `develop` unnoticed. On 2026-11-19 gitleaks 8.30.1 scanned the 640 commits reachable from `HEAD` in under a second and found one match, a False positive. A blocking Secret scan therefore costs almost nothing now and turns into history clean-up later. mise now pins External tools, so gitleaks can be pinned the same way.

## What Changes

- Pin gitleaks as an External tool in `mise.toml`, with its checksums in `mise.lock`.
- Add a Secret scan that blocks from the first commit:
    - **pre-commit**: scans the staged changes after lint-staged has applied its fixes.
    - **pre-push**: scans the commits that no remote has yet, including what a merge commit resolves.
    - **CI**: a new `secrets` job scans the full history of the checked-out commit on every pull request and every push, under the required `main` check.
- The pre-commit hook now needs mise, as the pre-push hook already does. It fails with a one-line hint when mise is missing.
- Add `.gitleaks.toml`, which extends gitleaks' default rules. It records the one False positive: the `finnhub-access-token` rule reads the type name `FinnhubResponseError` as a token.
- Define how a Revoked secret, a real credential left in history after it was revoked, is recorded. It goes in `.gitleaksignore` as a commit-scoped fingerprint, so the same credential added again still fails. The file is created only when the first one occurs.
- A real credential is revoked. It is never recorded as a False positive, and history is not rewritten.
- README documents gitleaks under External tools.

## Capabilities

### New Capabilities

- `secret-scan`: where the Secret scan runs (pre-commit, pre-push, CI), what each run covers, how False positives and Revoked secrets are recorded, and what happens when a real credential is found.

### Modified Capabilities

- `ci-job-layout`: the CI workflow gains a fifth parallel check job, `secrets`, and the `main` check depends on it.

## Impact

- New files: `.gitleaks.toml`.
- Changed files: `mise.toml`, `mise.lock`, `.husky/pre-commit`, `.husky/pre-push`, `.github/workflows/ci.yml` (new `secrets` job, `main.needs`), `README.md`.
- Developers need mise 2026.10.0 or newer to commit, not only to push. The hooks install gitleaks on first use.
- No new action: the `secrets` job reuses `actions/checkout` and `jdx/mise-action` at the SHAs `cve-scan.yml` already pins.
- No package, export or peer dependency changes.
- This change modifies `ci-job-layout` on top of the unarchived `add-osv-scanner-via-mise` change, so it must be archived after that one.
- Terms: Secret scan, False positive and Revoked secret, in the Tooling section of the [Workspace glossary](../../../docs/GLOSSARY.md). Decision record: beads `agentic-task-6c2p.57`.
