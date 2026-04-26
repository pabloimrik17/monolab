## Why

`nrwl/nx-set-shas@v4` is outdated: v5 (2026-03-20) updates the runtime to Node 24 and refreshes internal deps. On top of that, using mutable tags (`@v4`, `@v5`) in GitHub Actions is a supply-chain risk: a compromise of any action's repo (including official `actions/*`) would execute arbitrary code with access to `NX_CLOUD_ACCESS_TOKEN` and `CODECOV_TOKEN`. Solve both at once: bump + pin every action to a commit SHA + delegate ongoing maintenance to Renovate. While we're at it, harden the Renovate cadence to spread CI load and lengthen the supply-chain release-age window.

## What Changes

- Bump `nrwl/nx-set-shas@v4` → SHA-pinned `@afb73a62d26e41464e9254689e1fd6122ee683c1 # v5.0.1` in `.github/workflows/ci.yml`
- Pin **every** remaining action in `.github/workflows/ci.yml` and `.github/workflows/release-please.yml` to a 40-char commit SHA with `# vX.Y.Z` comment (no Renovate-deferred carve-out — repo is spec-compliant on merge)
- Configure Renovate with the `helpers:pinGitHubActionDigestsToSemver` preset so it: (a) automatically pins new actions to SHA, (b) updates pinned SHAs while keeping the readable `# vX.Y.Z` comment, (c) opens minor/major PRs based on the semver of the comment
- Policy: **all** GitHub Actions (third-party and official `actions/*`) MUST be pinned to a 40-char commit SHA with a `# vX.Y.Z` comment. No carve-outs — aligns with OpenSSF Scorecard "Pinned-Dependencies" and removes a class of supply-chain assumptions
- Renovate cadence hardening:
  - `minimumReleaseAge`: `7 days` → `14 days` (extra window for npm/Actions Marketplace supply-chain detection)
  - Stagger schedules to avoid same-day PR spikes: patch on day 1, minor on day 8 (every 2 months), major on day 15 (every 3 months)

## Capabilities

### New Capabilities
- `ci-github-actions-pinning`: policy and mechanics for versioning all GitHub Actions in CI workflows (pin to commit SHA with a semver comment, maintenance via Renovate)

### Modified Capabilities
<!-- None. There is no prior spec for CI workflows. -->

## Impact

- `.github/workflows/ci.yml`: nx-set-shas bump + all remaining actions SHA-pinned (`actions/checkout`, `pnpm/action-setup`, `actions/setup-node`, `actions/cache/{restore,save}`, `actions/upload-artifact`, `codecov/codecov-action`, `codecov/test-results-action`)
- `.github/workflows/release-please.yml`: all 5 actions SHA-pinned (`googleapis/release-please-action`, `actions/checkout`, `pnpm/action-setup`, `actions/setup-node`, `denoland/setup-deno`)
- `renovate.json`: 1 entry added to `extends`, `minimumReleaseAge` bumped, schedule strings staggered
- No functional changes in CI: v5 keeps the same inputs/outputs as v4; the runner already runs Node 24.12.0
- Low risk: if v5 fails, revert is a 1-line change. Renovate cadence changes only delay PRs, don't break CI
