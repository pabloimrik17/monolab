# pnpm-install-hardening Specification

## Purpose
Defines the supply-chain settings in `pnpm-workspace.yaml` that make installs refuse freshly published, trust-downgraded or script-running dependencies unless explicitly approved.

## Requirements
### Requirement: pnpm SHALL delay fresh releases

`pnpm-workspace.yaml` SHALL set `minimumReleaseAge: 1440` (minutes, 1 day).

#### Scenario: Release age configured

- **WHEN** `pnpm-workspace.yaml` is inspected
- **THEN** `minimumReleaseAge` is `1440`

### Requirement: pnpm SHALL block exotic subdependencies

`pnpm-workspace.yaml` SHALL set `blockExoticSubdeps: true`.

#### Scenario: Exotic subdeps blocked

- **WHEN** `pnpm-workspace.yaml` is inspected
- **THEN** `blockExoticSubdeps` is `true`

### Requirement: pnpm SHALL refuse trust downgrades

`pnpm-workspace.yaml` SHALL set `trustPolicy: no-downgrade`.

#### Scenario: Trust policy set

- **WHEN** `pnpm-workspace.yaml` is inspected
- **THEN** `trustPolicy` is `no-downgrade`

### Requirement: pnpm SHALL fail on unreviewed dependency builds

`pnpm-workspace.yaml` SHALL set `strictDepBuilds: true` explicitly, so a dependency build script missing from `allowBuilds` fails the install.

#### Scenario: Strict builds explicit

- **WHEN** `pnpm-workspace.yaml` is inspected
- **THEN** `strictDepBuilds` is `true`

#### Scenario: Fresh install passes

- **WHEN** `pnpm install --frozen-lockfile` runs on a clean checkout
- **THEN** it exits 0
