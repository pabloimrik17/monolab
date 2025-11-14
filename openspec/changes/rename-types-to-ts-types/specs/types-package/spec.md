# Types Package Specification Delta

This delta modifies the `types-package` specification to reflect the package rename from `types` to `ts-types`.

## MODIFIED Requirements

### Requirement: Package Structure

The `@monolab/ts-types` package SHALL provide a standard library structure for sharing TypeScript type definitions across the monorepo.

#### Scenario: Package metadata is correctly configured

- **GIVEN** the types package directory at `packages/ts-types/`
- **THEN** `package.json` SHALL have name `@monolab/ts-types`
- **AND** it SHALL have `type: "module"` for ESM support
- **AND** it SHALL have `sideEffects: false` for tree-shaking
- **AND** it SHALL export types through `exports` field with proper paths

#### Scenario: JSR configuration

- **GIVEN** the types package has JSR publishing enabled
- **THEN** `jsr.json` SHALL exist at the package root
- **AND** it SHALL have name `@monolab/ts-types`
- **AND** it SHALL have a valid exports configuration

#### Scenario: Nx project configuration

- **GIVEN** the types package is part of the Nx workspace
- **THEN** `project.json` SHALL have name `@monolab/ts-types`
- **AND** it SHALL be tagged with `npm:public`
- **AND** it SHALL have appropriate build, lint, and test targets

### Requirement: Documentation

The package SHALL include comprehensive documentation for consumers.

#### Scenario: README includes correct package name

- **GIVEN** a consumer reads the package README
- **THEN** the README SHALL reference `@m0n0lab/ts-types` in installation instructions
- **AND** it SHALL show import examples using `@m0n0lab/ts-types`
- **AND** it SHALL include npm and JSR installation commands with correct package name

#### Scenario: Source code comments reference correct package

- **GIVEN** generated type declarations from the build
- **THEN** the index.ts header comment SHALL mention `@monolab/ts-types`
- **AND** test files SHALL reference `@monolab/ts-types` in describe blocks

### Requirement: Release Configuration

The package SHALL be configured for automated releases with the new name.

#### Scenario: Release Please configuration

- **GIVEN** Release Please manages package versions
- **THEN** `release-please-config.json` SHALL have an entry for `packages/ts-types`
- **AND** the entry SHALL specify `package-name: "@m0n0lab/ts-types"`
- **AND** it SHALL include `extra-files: ["jsr.json"]` for synchronized versioning

### Requirement: Code Coverage Integration

The package SHALL be integrated with Codecov for coverage tracking using the `ts-types` flag.

#### Scenario: Codecov project coverage

- **GIVEN** code coverage is collected for the types package
- **THEN** `codecov.yaml` SHALL define a `coverage.status.project.ts-types` section
- **AND** it SHALL reference the flag `ts-types`
- **AND** it SHALL set `target: auto` and `threshold: 2%`

#### Scenario: Codecov patch coverage

- **GIVEN** new code is added to the types package
- **THEN** `codecov.yaml` SHALL define a `coverage.status.patch.ts-types` section
- **AND** it SHALL reference the flag `ts-types`
- **AND** it SHALL set `target: 50%` and `threshold: 10%`

#### Scenario: Codecov flag definition

- **GIVEN** coverage reports are uploaded with flags
- **THEN** `codecov.yaml` SHALL define a flag `ts-types`
- **AND** it SHALL specify `paths: - packages/ts-types/`
- **AND** it SHALL enable `carryforward: true`

### Requirement: CI/CD Integration

The package SHALL be included in continuous integration workflows for coverage, testing, and bundle analysis.

#### Scenario: Affected package detection

- **GIVEN** CI runs on pull requests
- **THEN** `.github/workflows/ci.yml` SHALL include `ts-types` in the affected packages detection list
- **AND** it SHALL check for `@m0n0lab/ts-types` when determining which packages to process

#### Scenario: Coverage upload

- **GIVEN** unit tests with coverage have completed
- **THEN** CI SHALL upload coverage for `ts-types` to Codecov
- **AND** it SHALL use the flag `ts-types`
- **AND** it SHALL read from `./packages/ts-types/coverage/lcov.info`

#### Scenario: Test results upload

- **GIVEN** unit tests have completed (pass or fail)
- **THEN** CI SHALL upload test results for `ts-types` to Codecov
- **AND** it SHALL use the flag `ts-types`
- **AND** it SHALL read from `./packages/ts-types/test-results.junit.xml`

#### Scenario: Bundle size analysis

- **GIVEN** the package has been built
- **THEN** CI SHALL analyze the bundle size for `ts-types`
- **AND** it SHALL upload results to Codecov with bundle-name `ts-types`
- **AND** it SHALL check for `packages/ts-types/dist` directory

## REMOVED Requirements

### Requirement: Legacy Package Names

**Reason**: The package has been renamed from `types` to `ts-types` for improved semantic clarity.

**Migration**:
- Update all references from `@m0n0lab/types` to `@m0n0lab/ts-types`
- Update all references from `@monolab/types` to `@monolab/ts-types`
- Update directory references from `packages/types/` to `packages/ts-types/`
- The old package `@m0n0lab/types` is deprecated on NPM and JSR with migration instructions
