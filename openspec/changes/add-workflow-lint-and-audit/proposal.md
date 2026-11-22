# Proposal

## Why

Nothing checks the CI workflows themselves. A mistyped expression or action input shows up only when the workflow runs. Nothing flags a workflow that could be abused either: a token with more rights than its jobs need, untrusted text expanded into a shell command, or a git credential left on disk for third-party code to read. The SHA-pinning rule in `ci-github-actions-pinning` is enforced only by review.

On 2026-11-22, actionlint 1.7.12 and zizmor 1.32.0 were run over the five workflows. Every finding below can be fixed:

- actionlint: 0 findings without shellcheck, 7 with it.
- zizmor: 14 findings, the same offline and online.

So both checks can block from the first commit. mise already pins External tools, so both tools can be pinned the same way.

## What Changes

- Pin zizmor 1.32.0, actionlint 1.7.12 (`aqua:rhysd/actionlint`) and shellcheck 0.11.0 as External tools in `mise.toml`, with their checksums in `mise.lock`.
- Add a Workflow lint (actionlint) and a Workflow audit (zizmor). Both block from the first commit:
    - **pre-commit**: through lint-staged, on staged workflow files only. zizmor runs offline. actionlint runs without shellcheck, because actionlint 1.7.12 can hang when it calls shellcheck on Apple Silicon Macs.
    - **CI**: a new `workflows` job runs on every pull request and every push, under the required `main` check. It runs actionlint with shellcheck and zizmor with the GitHub API (online audits). Findings show as pull request annotations, with no SARIF upload.
- Fix the current findings:
    - Checkouts stop keeping the git credential on disk, except `prettify-pr`, which pushes and says so explicitly.
    - `release-please.yml` grants permissions per job instead of to the whole workflow.
    - Step outputs reach shell scripts through `env`.
    - Shell variables are quoted.
    - The `cve` job calls its reusable workflow with GitHub's self-repository syntax (`$/`).
- Define the Accepted finding: a Workflow lint or Workflow audit finding left in place on purpose.
    - It is recorded at its line when the tool allows: `# zizmor: ignore[...]` or `# shellcheck disable=...`, each with a reason.
    - Otherwise it goes in `.github/actionlint.yaml`, scoped by path and message.
    - `.github/zizmor.yml` stays at zizmor's defaults: a comment and an empty `rules` map.
    - The only one today: actionlint 1.7.12 rejects `$/`.
- README documents both tools under External tools.

## Capabilities

### New Capabilities

- `workflow-lint`: where the Workflow lint runs (pre-commit, CI), what it checks, when shellcheck is part of it, and how its Accepted findings are recorded.
- `workflow-audit`: where the Workflow audit runs (pre-commit offline, CI online), its blocking policy, the workflow hardening it enforces today, and how its Accepted findings are recorded.

### Modified Capabilities

- `ci-job-layout`: the CI workflow gains a sixth parallel check job, `workflows`, and the `main` check depends on it.
- `ci-github-actions-pinning`: the Workflow audit enforces the SHA-pin rule mechanically. It rejects a mutable tag and a `# vX.Y.Z` comment that does not match the pinned commit. The requirement is restated in English.

## Impact

- New files: `.github/actionlint.yaml` and `.github/zizmor.yml` (zizmor's defaults: a comment and `rules: {}`).
- Changed files:
    - `mise.toml`, `mise.lock`, `lint-staged.config.ts`.
    - `.github/workflows/ci.yml`: new `workflows` job, `main.needs`, checkouts, and `$/` for `cve`.
    - `.github/workflows/release-please.yml`: permissions, checkouts, `env`, quoting.
    - `.github/workflows/renovate-config-validator.yml` and `.github/workflows/pullfrog.yml`: checkouts.
    - `README.md`.
- `release-please.yml` runs only on pushes to `main`, so pull request CI cannot exercise its changes. The next release verifies them.
- No new action: the `workflows` job reuses `actions/checkout` and `jdx/mise-action` at the SHAs the `secrets` job already pins.
- Developers need nothing new: the hooks already require mise and install the tools on first use.
- No package, export or peer dependency changes.
- Terms: Workflow lint, Workflow audit and Accepted finding, in the Tooling section of the [Workspace glossary](../../../docs/GLOSSARY.md). Decision record: beads `agentic-task-6c2p.59`.
