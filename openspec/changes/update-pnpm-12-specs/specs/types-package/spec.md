## MODIFIED Requirements

### Requirement: Package Metadata

The package SHALL include proper versioning, authoring, and publishing configuration.

#### Scenario: Package identification

- **WHEN** the package is initialized
- **THEN** `package.json` SHALL have name `@m0n0lab/ts-types`
- **AND** initial version SHALL be `0.1.0` (follows semver after initial release)
- **AND** author field SHALL be set to `Pablo F.G.`

#### Scenario: Publishing configuration

- **WHEN** preparing for publication
- **THEN** `engines` field SHALL require Node `^20.18.0 || >=22.0.0` and pnpm 12.14.0
- **AND** `packageManager` SHALL specify pnpm 12.14.0
- **AND** `publishConfig` SHALL set `access: "public"`
- **AND** `publishConfig` SHALL use npm registry URL
