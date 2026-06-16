## Why

`renovate.json` extends `config:recommended`, missing the extra safety/hygiene rules that Renovate's `config:best-practices` bundles (devDep pinning, abandonment flags, npm release-age floor, action-digest pinning). Security PRs are also throttled behind routine updates (`prHourlyLimit: 2` / `prConcurrentLimit: 10`), and config breakage is only caught on the next Renovate cron run — not at commit/PR time. Issue #204 asks to adopt `config:best-practices`, harden coverage, unblock vulnerability PRs, and gate config validity.

## What Changes

- Replace base preset `config:recommended` → **`config:best-practices`**.
- Remove presets/keys now subsumed by `config:best-practices`: `helpers:pinGitHubActionDigestsToSemver` (transitively included), explicit `configMigration: true` (set by the preset).
- Add hardening presets: `security:openssf-scorecard`, `docker:enableMajor`, `customManagers:githubActionsVersions`, `customManagers:dockerfileVersions`, `:maintainLockFilesWeekly`.
- **Omit `:enablePreCommit`** — repo has no `.pre-commit-config.yaml` (uses Husky + lint-staged), so the preset would be inert; revisit if prek is adopted.
- Add `vulnerabilityAlerts: { prHourlyLimit: 0, prConcurrentLimit: 0 }` to exempt security PRs from global throttling (works with existing `:enableVulnerabilityAlertsWithLabel(security)`).
- Preserve `minimumReleaseAge: "14 days"` as the effective floor for npm — `config:best-practices` brings `security:minimumReleaseAgeNpm` (3 days) which must NOT silently lower it (the `ci-github-actions-pinning` spec mandates ≥14 days).
- Wire **`renovate-config-validator`** (pinned `renovate@<ver>`, no floating `npx`) at two gates: a path-filtered GitHub Actions workflow and a Husky/lint-staged entry scoped to renovate config files.
- Add a custom manager for the `pnpm dlx -p <pkg>@<ver> <cmd>` form so Renovate auto-bumps the pinned validator (existing managers only match `pnpm dlx|bunx|npx <pkg>@<ver>`).

## Capabilities

### New Capabilities
- `renovate-config-hardening`: the `renovate.json` baseline — `config:best-practices` adoption, redundant-preset removal, added hardening presets, and the `vulnerabilityAlerts` throttling exemption.
- `renovate-config-validation`: validating Renovate config before merge — pinned `renovate-config-validator` in CI (path-filtered) and pre-commit (Husky/lint-staged, file-filtered), plus the custom manager that keeps the pinned validator version current.

### Modified Capabilities
- `ci-github-actions-pinning`: the action-digest pin preset requirement now allows transitive inclusion via `config:best-practices` (no longer requires the literal `helpers:pinGitHubActionDigestsToSemver` string in `extends`); the ≥14-day `minimumReleaseAge` requirement is clarified to remain the effective floor for npm despite `security:minimumReleaseAgeNpm`.

## Impact

- **Files**: `renovate.json` (extends, vulnerabilityAlerts, customManagers); new `.github/workflows/renovate-config-validator.yml`; `lint-staged.config.ts` (validator entry); custom-manager `fileMatch` extended to cover `lint-staged.config.ts`.
- **Behavior**: more update PRs surfaced (docker major, OpenSSF scorecard data, pre-commit/dockerfile/gha version managers); security PRs unthrottled; CI/commit fail fast on invalid renovate config.
- **Risk**: `security:minimumReleaseAgeNpm` lowering the npm release window below 14 days if not re-asserted; new custom manager regex over-matching `pnpm dlx -p` invocations.
- **No app/runtime impact**: tooling/config only; no published-package changes.
