## Context

`renovate.json` extends `config:recommended` plus `:dependencyDashboard`, `:semanticCommits`, `:enableVulnerabilityAlertsWithLabel(security)`, `helpers:pinGitHubActionDigestsToSemver`. Top-level it pins everything (`rangeStrategy: "pin"`), sets `minimumReleaseAge: "14 days"`, `configMigration: true`, global `prHourlyLimit: 2` / `prConcurrentLimit: 10`, staggered patch/minor/major schedules, and three regex custom managers (opencode.json, .mcp.json, and a `pnpm dlx|bunx|npx <pkg>@<ver>` matcher for CI workflows).

Issue #204 asks to migrate to `config:best-practices` and add a validator gate. Two repo realities diverge from the issue text:
1. The repo uses **Husky + lint-staged** (`lint-staged.config.ts`, `.husky/pre-commit`), not **prek** — there is no `.pre-commit-config.yaml`.
2. The issue's "Before" block is illustrative; the actual `extends` is smaller than what it shows.

`config:best-practices` bundles: `config:recommended`, `docker:pinDigests`, `helpers:pinGitHubActionDigestsToSemver`, `:pinDevDependencies`, `abandonments:recommended`, `security:minimumReleaseAgeNpm`, and sets `configMigration: true`.

The existing `ci-github-actions-pinning` spec already constrains `renovate.json` (mandates the action-digest pin preset and a ≥14-day release age), so this change must keep that capability satisfied.

## Goals / Non-Goals

**Goals:**
- Adopt `config:best-practices` as the single base preset; drop now-redundant `helpers:pinGitHubActionDigestsToSemver` and explicit `configMigration: true`.
- Add hardening presets: `security:openssf-scorecard`, `docker:enableMajor`, `customManagers:githubActionsVersions`, `customManagers:dockerfileVersions`, `:maintainLockFilesWeekly`.
- Exempt vulnerability PRs from global throttling via `vulnerabilityAlerts: { prHourlyLimit: 0, prConcurrentLimit: 0 }`.
- Gate config validity in CI (path-filtered workflow) and pre-commit (lint-staged), with a pinned `renovate` version and a custom manager that bumps it.
- Keep the effective npm release-age floor at ≥14 days.

**Non-Goals:**
- Introducing prek / `.pre-commit-config.yaml` (and therefore `:enablePreCommit`).
- Changing `rangeStrategy: "pin"`, the staggered patch/minor/major schedules, or the Expo/node `packageRules`.
- Migrating to `renovate.json5` or relocating config to `.github/`.
- Touching published-package behavior.

## Decisions

**1. Validator pre-commit gate via Husky/lint-staged, not prek.**
Add a `lint-staged.config.ts` entry keyed to the Renovate config path(s) that runs `pnpm dlx -p renovate@<ver> renovate-config-validator --strict` (ignoring passed filenames — validate the config file directly). Rationale: the repo already standardizes pre-commit on Husky + lint-staged; introducing prek means two hook systems for one check. Alternative (prek per issue) rejected: heavier, redundant tooling.

**2. Omit `:enablePreCommit`.** With no `.pre-commit-config.yaml`, Renovate's pre-commit manager has nothing to scan — the preset is inert. Adding it now is harmless but misleading; defer until/if prek is adopted. Captured as an open question.

**3. Pin the validator with `pnpm dlx -p renovate@<ver>` (no floating `npx`).** Reproducible CI/local runs; Renovate keeps it current. The exact version is resolved to the current stable `renovate` at implementation time (the `40.0.0` in the issue is illustrative).

**4. New custom manager for the `-p` form, complementing the existing one.** The current matcher `(?:pnpm dlx|bunx|npx) (?<depName>…)@(?<currentValue>…)` does not match `pnpm dlx -p <pkg>@<ver> <cmd>`. Add a second regex manager with `matchStrings: ["pnpm dlx -p (?<depName>(?:@[^/\\s]+/)?[^@\\s]+)@(?<currentValue>[^\\s]+)"]` and `datasourceTemplate: "npm"`. Because the pinned version lives in both the workflow and `lint-staged.config.ts`, `fileMatch` MUST include `^\\.github/workflows/.+\\.ya?ml$` and `^lint-staged\\.config\\.ts$` (the issue listed only workflows + `.pre-commit-config.yaml`).

**5. Preserve the 14-day npm floor.** `config:best-practices` brings `security:minimumReleaseAgeNpm` (3 days for npm), which would override the top-level `minimumReleaseAge: "14 days"` for npm via a packageRule. To satisfy `ci-github-actions-pinning`, keep the effective npm window at ≥14 days — verify after migration whether the top-level value still wins; if not, re-assert with a trailing `packageRule` (`matchDatasources: ["npm"]`, `minimumReleaseAge: "14 days"`).

**6. Clean redundancies (user decision).** Remove explicit `helpers:pinGitHubActionDigestsToSemver` and `configMigration: true`; keep `:dependencyDashboard`, `:semanticCommits`, `:enableVulnerabilityAlertsWithLabel(security)`, `rangeStrategy: "pin"`, and all repo-specific keys/rules.

**7. CI workflow is standalone and path-filtered.** A new `.github/workflows/renovate-config-validator.yml` triggered on `pull_request` with a `paths` filter over the Renovate config files, with SHA-pinned `actions/checkout` + `pnpm/action-setup` (per `ci-github-actions-pinning`). Kept out of the large `ci.yml` so it stays fast and independently skippable.

## Risks / Trade-offs

- **`security:minimumReleaseAgeNpm` silently lowers the npm window to 3 days** → Verify effective value post-migration; re-assert 14 days with a trailing npm `packageRule` if needed (Decision 5). Covered by a validation scenario in `ci-github-actions-pinning`.
- **New `-p` regex manager over-matches other `pnpm dlx -p` invocations** → Scope `fileMatch` to the two known files; review Renovate's first dependency-dashboard render for spurious entries.
- **`docker:enableMajor` / `customManagers:*` surface new no-op or noisy PRs** if no Dockerfile / `_VERSION:` env vars exist → Presets are safe no-ops when target files are absent; acceptable, and forward-compatible.
- **`config:best-practices` may add `:pinDevDependencies` semantics on top of global `rangeStrategy: "pin"`** → Redundant but harmless (everything already pinned).
- **Validator version drift between CI and lint-staged** → Single custom manager covers both files so Renovate bumps them together; both reference the same pinned string.

## Migration Plan

1. Edit `renovate.json`: swap base preset, remove redundancies, add hardening presets + `vulnerabilityAlerts` + the `-p` custom manager.
2. Add `.github/workflows/renovate-config-validator.yml` (path-filtered, pinned, `--strict`, SHA-pinned actions).
3. Add the validator entry to `lint-staged.config.ts` scoped to the Renovate config path.
4. Run `pnpm dlx -p renovate@<ver> renovate-config-validator --strict renovate.json` locally; fix any errors.
5. Verify effective npm `minimumReleaseAge` ≥ 14 days; add re-assertion `packageRule` if the preset lowered it.
6. Open PR against `develop` (matches `baseBranchPatterns`); the new workflow self-validates.

**Rollback:** revert the three files; no runtime/published-package state to unwind.

## Open Questions

- Exact `renovate` version to pin — resolve to the current stable at implementation time.
- Should `:enablePreCommit` be added pre-emptively for a future prek adoption, or strictly omitted until `.pre-commit-config.yaml` exists? (Currently: omit.)
- Does the top-level `minimumReleaseAge: "14 days"` still win for npm after adding `config:best-practices`, or is a re-assertion `packageRule` required? (Verify during implementation.)
