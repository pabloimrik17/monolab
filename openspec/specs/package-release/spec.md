## MODIFIED Requirements

### Requirement: Package Configuration

All publishable packages SHALL be properly configured for dual registry publishing.

#### Scenario: npm configuration

- **WHEN** a package is configured for publishing
- **THEN** package.json SHALL contain:
  - Scoped name (@monolab/package-name)
  - publishConfig with registry and access settings
  - Valid version following semver

#### Scenario: JSR configuration

- **WHEN** a package is configured for JSR
- **THEN** package SHALL have jsr.json with version field
- **AND** package SHALL have valid exports configuration
- **AND** package SHALL build to valid ESM format

#### Scenario: Version synchronization

- **WHEN** release-please updates package versions
- **THEN** both package.json and jsr.json SHALL be updated with the same version
- **AND** version SHALL be consistent between both files in the release PR

#### Scenario: Package inclusion

- **WHEN** determining which packages to release
- **THEN** all packages in packages/ directory SHALL be included (is-even, is-odd, react-clean, react-hooks, ts-configs, http-client)
- **AND** ts-configs SHALL be included in automated releases
- **AND** http-client SHALL be included in automated releases
- **AND** packages MAY be excluded via configuration if needed in the future
