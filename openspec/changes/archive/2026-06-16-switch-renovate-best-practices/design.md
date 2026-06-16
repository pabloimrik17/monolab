## Context

`renovate.json` extends `config:recommended` plus `:dependencyDashboard`, `:semanticCommits`, `:enableVulnerabilityAlertsWithLabel(security)`, `helpers:pinGitHubActionDigestsToSemver`. Top-level it pins everything (`rangeStrategy: "pin"`), sets `minimumReleaseAge: "14 days"`, `configMigration: true`, global `prHourlyLimit: 2` / `prConcurrentLimit: 10`, staggered patch/minor/major schedules, and three regex custom managers (opencode.json, .mcp.json, and a `pnpm dlx|bunx|npx <pkg>@<ver>` matcher for CI workflows).

Issue #204 asks to migrate to `config:best-practices` and add a validator gate. Two repo realities diverge from the issue text:
1. The repo uses **Husky + lint-staged** (`lint-staged.config.ts`, `.husky/pre-commit`), not **prek** — there is no `.pre-commit-config.yaml`.
2. The issue's "Before" block is illustrative; the actual `extends` is smaller than what it shows.

`config:best-practices` bundles: `config:recommended`, `docker:pinDigests`, `helpers:pinGitHubActionDigestsToSemver`, `:pinDevDependencies`, `abandonments:recommended`, `security:minimumReleaseAgeNpm`, and sets `configMigration: true`.

The existing `ci-github-actions-pinning` spec already constrains `renovate.json` (mandates the action-digest pin preset and a ≥14-day release age), so this change must keep that capability satisfied.

## Goals / Non-Goals

**Goals:**
- Adopt `config:best-practices` as the single base preset; drop now-redundant `helpers:pinGitHubActionDigestsToSemver`, explicit `configMigration: true`, and `:dependencyDashboard`.
- Add hardening presets: `security:openssf-scorecard`, `docker:enableMajor`, `customManagers:githubActionsVersions`, `customManagers:dockerfileVersions`, `:maintainLockFilesWeekly`.
- Exempt vulnerability PRs from global throttling via `vulnerabilityAlerts: { prHourlyLimit: 0, prConcurrentLimit: 0 }`.
- Gate config validity in CI (path-filtered workflow) and pre-commit (lint-staged), with a pinned `renovate` version and a custom manager that bumps it.
- Keep the effective npm release-age floor at ≥14 days.

**Non-Goals:**
- Introducing prek / `.pre-commit-config.yaml` (and therefore `:enablePreCommit`).
- Changing `rangeStrategy: "pin"`, the staggered patch/minor/major schedules, or the Expo/node `packageRules`.
- Migrating to `renovate.json5` or relocating config to `.github/`.
- Touching published-package behavior.
- Upgrading the repo's pnpm major (which would let `pnpm dlx` track the latest `renovate`).

## Decisions

**1. Validator pre-commit gate via Husky/lint-staged, not prek.**
A `lint-staged.config.ts` entry keyed to `"renovate.json"` runs `pnpm dlx --package renovate@43.220.0 renovate-config-validator --strict` (string form — lint-staged appends the staged `renovate.json`). Rationale: the repo already standardizes pre-commit on Husky + lint-staged; introducing prek means two hook systems for one check. Alternative (prek per issue) rejected: heavier, redundant tooling.

**2. Omit `:enablePreCommit`.** With no `.pre-commit-config.yaml`, Renovate's pre-commit manager has nothing to scan — the preset is inert. Adding it now is harmless but misleading; defer until/if prek is adopted. (Also kept omitted in the sibling dotfiles repo for alignment.)

**3. Pin the validator with `pnpm dlx --package renovate@43.220.0` (no floating `npx`).** Reproducible CI/local runs; Renovate keeps it current. `-p` is NOT used: `pnpm dlx` mis-parses the shorthand and runs the main `renovate` bot instead of the `renovate-config-validator` bin. Version pinned to `43.220.0` — the last release on pnpm `^10`; `renovate >= 43.221.0` requires pnpm 11 while this repo uses pnpm 10. A trailing `packageRule` (`matchDepNames: ["renovate"]`, `allowedVersions: "<43.221.0"`) caps Renovate so it never proposes a pnpm-11 bump until the repo upgrades pnpm. (Alternative considered: `npx --package`, which ignores the pnpm engine and could track latest — rejected to stay pnpm-native; the cap is one line.)

**4. New custom manager for the `--package` form, complementing the existing one.** The current matcher `(?:pnpm dlx|bunx|npx) (?<depName>…)@(?<currentValue>…)` does not match `pnpm dlx --package <pkg>@<ver> <cmd>`. Add a second regex manager with `matchStrings: ["pnpm dlx --package (?<depName>(?:@[^/\\s]+/)?[^@\\s]+)@(?<currentValue>[^\\s]+)"]` and `datasourceTemplate: "npm"`. Because the pinned version lives in both the workflow and `lint-staged.config.ts`, its `managerFilePatterns` MUST include `/^\\.github/workflows/.+\\.ya?ml$/` and `/^lint-staged\\.config\\.ts$/`. Renovate 43 deprecated `fileMatch` in favor of `managerFilePatterns` (regex values wrapped in `/.../`), so all existing customManagers are migrated too — required for `--strict` to pass and equivalent to what `:configMigration` would otherwise auto-PR.

**5. Preserve the 14-day npm floor.** `config:best-practices` brings `security:minimumReleaseAgeNpm` (a shorter window for npm) which would override the top-level `minimumReleaseAge: "14 days"` for npm via a packageRule. To satisfy `ci-github-actions-pinning`, a trailing `packageRule` (`matchDatasources: ["npm"]`, `minimumReleaseAge: "14 days"`) re-asserts the floor as the last-matching rule for npm.

**6. Clean redundancies (user decision).** Remove explicit `helpers:pinGitHubActionDigestsToSemver`, `configMigration: true`, and `:dependencyDashboard` (the dashboard stays active transitively via `config:best-practices`; `dependencyDashboardTitle` is kept). Keep `:semanticCommits`, `:enableVulnerabilityAlertsWithLabel(security)`, `rangeStrategy: "pin"`, and all repo-specific keys/rules. Dropping `:dependencyDashboard` also aligns with the sibling dotfiles Renovate config.

**7. CI workflow is standalone and path-filtered.** A new `.github/workflows/renovate-config-validator.yml` triggered on `pull_request` with a `paths` filter over the Renovate config files, with SHA-pinned `actions/checkout`, `pnpm/action-setup`, and `actions/setup-node` (Node 24.12.0; per `ci-github-actions-pinning`). Kept out of the large `ci.yml` so it stays fast and independently skippable.

## Risks / Trade-offs

- **`security:minimumReleaseAgeNpm` silently lowers the npm window** → Re-asserted to 14 days with a trailing npm `packageRule` (Decision 5). Covered by a validation scenario in `ci-github-actions-pinning`; confirm effective value post-merge via the Dependency Dashboard.
- **New `--package` regex manager over-matches other `pnpm dlx --package` invocations** → Scope `managerFilePatterns` to the two known files; review Renovate's first dependency-dashboard render for spurious entries.
- **`docker:enableMajor` / `customManagers:*` surface new no-op or noisy PRs** if no Dockerfile / `_VERSION:` env vars exist → Presets are safe no-ops when target files are absent; acceptable, and forward-compatible.
- **`config:best-practices` may add `:pinDevDependencies` semantics on top of global `rangeStrategy: "pin"`** → Redundant but harmless (everything already pinned).
- **Validator version drift between CI and lint-staged** → A single custom manager covers both files so Renovate bumps them together; both reference the same pinned string.
- **`allowedVersions` cap freezes `renovate` at the pnpm-10 line** → Intentional; lift the cap when the repo moves to pnpm 11.

## Migration Plan

1. Edit `renovate.json`: swap base preset, remove redundancies (incl. `:dependencyDashboard`), add hardening presets + `vulnerabilityAlerts` + the `--package` custom manager + the npm-floor rule + the `allowedVersions` cap; migrate `fileMatch` → `managerFilePatterns`.
2. Add `.github/workflows/renovate-config-validator.yml` (path-filtered, pinned, `--strict`, SHA-pinned actions).
3. Add the validator entry to `lint-staged.config.ts` scoped to `renovate.json`.
4. Run `pnpm dlx --package renovate@43.220.0 renovate-config-validator --strict renovate.json` locally; fix any errors.
5. Effective npm `minimumReleaseAge` is held at ≥14 days via the re-assertion `packageRule`.
6. Open PR against `develop` (matches `baseBranchPatterns`); the new workflow self-validates.

**Rollback:** revert the three files; no runtime/published-package state to unwind.

## Open Questions

- ~~Exact `renovate` version to pin~~ — resolved: `43.220.0` (last pnpm-`^10` release) + `allowedVersions: "<43.221.0"` cap.
- ~~Should `:enablePreCommit` be added pre-emptively~~ — resolved: omitted until `.pre-commit-config.yaml` exists (aligned with dotfiles).
- ~~Does the top-level `minimumReleaseAge` still win for npm~~ — resolved: re-asserted via a trailing npm `packageRule`; confirm the effective value post-merge via the Dependency Dashboard.
