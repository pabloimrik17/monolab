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

### Requirement: Reviewed dependency skills SHALL have explicit grants

The workspace SHALL grant the bundled agent skills of its existing fallow and varlock dependencies through `permissions.fallow.skills: true` and `permissions.varlock.skills: true` in `pnpm-workspace.yaml`. These skill grants SHALL NOT grant dependency build execution or weaken existing install-hardening settings.

#### Scenario: Skills are explicitly approved

- **WHEN** `pnpm permissions list` runs with the workspace-pinned pnpm version
- **THEN** fallow and varlock are listed as granted the `skills` capability
- **AND** neither package is awaiting skill approval

#### Scenario: Build restrictions remain independent

- **WHEN** the reviewed skill decisions are applied
- **THEN** existing build denials and `strictDepBuilds: true` remain effective
- **AND** no `build: true` grant is introduced by the skill decision

### Requirement: Installation SHALL complete without pending skill approvals

The workspace SHALL install its locked dependencies successfully without reporting pending agent-skill approvals for fallow or varlock. Validation SHALL use the existing pnpm workspace and lockfile.

#### Scenario: Frozen install succeeds

- **WHEN** `pnpm install --frozen-lockfile` runs at the workspace root
- **THEN** it exits with code 0
- **AND** it reports no pending agent-skill approvals for fallow or varlock
- **AND** the lockfile is unchanged
