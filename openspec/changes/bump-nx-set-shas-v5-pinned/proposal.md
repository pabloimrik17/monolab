## Why

`nrwl/nx-set-shas@v4` is outdated: v5 (2026-03-20) updates the runtime to Node 24 and refreshes internal deps. On top of that, using mutable tags (`@v4`, `@v5`) in GitHub Actions is a supply-chain risk: a compromise of the action's repo would execute arbitrary code with access to `NX_CLOUD_ACCESS_TOKEN` and `CODECOV_TOKEN`. Solve both at once: bump + pin to a commit SHA + delegate ongoing maintenance to Renovate.

## What Changes

- Bump `nrwl/nx-set-shas@v4` → SHA-pinned `@afb73a62d26e41464e9254689e1fd6122ee683c1 # v5.0.1` in `.github/workflows/ci.yml`
- Configure Renovate with the `helpers:pinGitHubActionDigestsToSemver` preset so it: (a) automatically pins new actions to SHA, (b) updates pinned SHAs while keeping the readable `# vX.Y.Z` comment, (c) opens minor/major PRs based on the semver of the comment
- Policy: SHA pinning applies only to third-party actions (`nrwl/*`, `pnpm/*`, `codecov/*`). Official GitHub actions (`actions/*`) stay on a major tag (`@v4`) — they're trusted and reduce PR noise

## Capabilities

### New Capabilities
- `ci-github-actions-pinning`: policy and mechanics for versioning third-party GitHub Actions in CI workflows (pin to commit SHA with a semver comment, maintenance via Renovate)

### Modified Capabilities
<!-- None. There is no prior spec for CI workflows. -->

## Impact

- `.github/workflows/ci.yml` (1 step modified)
- `renovate.json` (1 entry added to `extends`)
- No functional changes in CI: v5 keeps the same inputs/outputs as v4; the runner already runs Node 24.12.0
- Low risk: if v5 fails, revert is a 1-line change
