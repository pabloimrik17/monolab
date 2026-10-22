# Design

## Context

`config:best-practices` extends `security:minimumReleaseAgeNpm`: an npm rule at 3 days plus null-age rules for `pin`, `replacement`, `bump`, `lockfileUpdate`, `rollback`, `lockFileMaintenance`. Rules beat top-level config. The current unscoped npm 14-day rule overrides those null-age exemptions too. See proposal.md - Why.

## Goals / Non-Goals

**Goals:** effective ages of 14 days (npm major/minor), 3 days (patch), none (pin/replacement/lockfile/vuln fix); pnpm gates strictly below Renovate's.

**Non-Goals:** `ignorePresets` of the age preset; `minimumReleaseAgeExclude(s)` (emergency path only, with a follow-up task); changing schedules or `:maintainLockFilesWeekly`; transitive CVE scanning (osv-scanner gate).

## Decisions

- **Scoped npm rule (major/minor) over ignoring the preset.** Ignoring drops the preset's exemptions and PR notes. Scoping keeps them. Top-level 14 days stays for datasources no rule touches.
- **Patch rule without datasource filter.** 3 days for patches everywhere; above pnpm's 1 day, satisfying the invariant.
- **Rule order:** new rules go after the schedule rules, before the Expo rule; the later patch rule wins over the major/minor rule only for patches (disjoint update types, so no conflict).
- **Descriptions:** one short concrete line each. Wording: "security:minimumReleaseAgeNpm (via config:best-practices) sets npm to 3 days; restore 14 for majors and minors" and "Patches wait 3 days, never below pnpm's minimumReleaseAge (pnpm-workspace.yaml)". No restating of mechanism or bypass behavior; no references to other repos.
- **pnpm knobs:** add `trustPolicy: no-downgrade` and `strictDepBuilds: true` beside `blockExoticSubdeps`. `strictDepBuilds` is explicit even if pnpm 11 defaults it on.
- **Vuln fixes:** rely on Renovate's `vulnerabilityAlerts` default null age; they still wait pnpm's 1 day (≤24 h).
- **Lock file maintenance:** unchanged; its only age guard is pnpm's.

## Risks / Trade-offs

- `trustPolicy: no-downgrade` flagged `chokidar@4.0.3`, `semver@6.3.1` and (in the validator's `pnpm dlx` tree) `@yarnpkg/libzip@3.2.2`: each was published by hand without provenance after a version that had it. All three were vetted (maintainers unchanged, tarball matches the upstream tag, no OSV or GitHub advisories) and excluded by exact `name@version` with a one-line reason; no ranges. Any new flagged version needs the same vetting.
- `osvVulnerabilityAlerts` is experimental → accepted; direct deps only.
- The validator pin `renovate@43.220.0` was capped for pnpm 10, but the repo is on pnpm 11.15.0 → bump the pin to `renovate@44.140.0` (newest release older than 14 days) in the workflow and `lint-staged.config.ts`; its `pnpm dlx` tree needs the three excludes above.
- Fixes younger than 1 day wait up to 24 h → accepted; emergency `minimumReleaseAgeExclude` only for actively exploited CRITICAL.
