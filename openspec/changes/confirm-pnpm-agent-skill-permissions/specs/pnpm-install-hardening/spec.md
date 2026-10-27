## ADDED Requirements

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
