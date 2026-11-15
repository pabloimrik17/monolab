# Proposal

## Why

Freshly published npm versions are the entry point of recent worm and account-takeover waves; each was pulled within hours. Renovate and pnpm already delay new releases, but the npm age is only partly enforced: `config:best-practices` brings a 3-day npm rule that beats the top-level 14 days, and the current unscoped npm override also gives `pin`/`replacement`/`lockfileUpdate` updates an age Renovate cannot check, so they are never proposed (`rangeStrategy: "pin"`). Vulnerability-fix PRs are inert because Dependabot alerts are off.

## What Changes

- `renovate.json`: add `osvVulnerabilityAlerts: true` (direct deps; fix PRs from osv.dev).
- `renovate.json`: replace the unscoped npm age rule with one scoped to `major`/`minor` at 14 days, so the preset's no-age exemptions apply again.
- `renovate.json`: add a `patch` rule with `minimumReleaseAge: "3 days"` on every datasource.
- `pnpm-workspace.yaml`: add `trustPolicy: no-downgrade` (with exact-version `trustPolicyExclude` for three vetted packages) and explicit `strictDepBuilds: true`.
- Bump the Renovate validator pin to `44.140.0` in `.github/workflows/renovate-config-validator.yml` and `lint-staged.config.ts`, and drop the stale pnpm 10 cap comment.
- Document the invariant: Renovate's smallest age (3 days) stays above pnpm's `minimumReleaseAge` (1 day), so Renovate never proposes a version pnpm refuses.

## Capabilities

### New Capabilities
- `pnpm-install-hardening`: pnpm workspace install-time supply-chain settings (release age, exotic subdeps, trust policy, strict dep builds).

### Modified Capabilities
- `renovate-config-hardening`: OSV alerts, scoped release-age rules, and the Renovate-age ≥ pnpm-age invariant.

## Impact

- Files: `renovate.json`, `pnpm-workspace.yaml`.
- Behavior: npm patch PRs appear after 3 days instead of 14 (monthly schedule unchanged); pin/replacement/lockfile updates stop being blocked by an unmeetable age; fresh installs reject trust-downgraded versions and unapproved dep build scripts.
- `osvVulnerabilityAlerts` is experimental in Renovate and covers direct dependencies only; transitive CVEs stay with the osv-scanner gate.
- Vulnerability fixes bypass Renovate's age but still wait pnpm's 1 day.
