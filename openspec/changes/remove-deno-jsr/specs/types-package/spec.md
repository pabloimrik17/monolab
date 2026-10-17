# Spec Delta

## MODIFIED Requirements

### Requirement: Package Structure

The `@m0n0lab/ts-types` package SHALL provide a standard library structure for sharing TypeScript type definitions across the monorepo.

#### Scenario: Package directory layout

- **WHEN** the package is created
- **THEN** it SHALL have directory structure: `packages/ts-types/src/` for source code
- **AND** it SHALL have `packages/ts-types/dist/` for compiled output
- **AND** it SHALL include `project.json` for Nx integration without Nx plugins

#### Scenario: Source organization

- **WHEN** types are added to the package
- **THEN** they SHALL be exported through `src/index.ts` entry point
- **AND** the package SHALL support tree-shaking via `sideEffects: false`

#### Scenario: Package metadata is correctly configured

- **GIVEN** the types package directory at `packages/ts-types/`
- **THEN** `package.json` SHALL have name `@m0n0lab/ts-types`
- **AND** it SHALL have `type: "module"` for ESM support
- **AND** it SHALL have `sideEffects: false` for tree-shaking
- **AND** it SHALL export types through `exports` field with proper paths

#### Scenario: JSR configuration

- **GIVEN** the types package directory at `packages/ts-types/`
- **THEN** `deno.json` and `jsr.json` SHALL NOT exist at the package root
- **AND** the package SHALL NOT be published to JSR

#### Scenario: Nx project configuration

- **GIVEN** the types package is part of the Nx workspace
- **THEN** `project.json` SHALL have name `@m0n0lab/ts-types`
- **AND** it SHALL be tagged with `npm:public`
- **AND** it SHALL have appropriate build, lint, and test targets

### Requirement: Documentation

The package SHALL include comprehensive documentation for consumers.

#### Scenario: README documentation

- **WHEN** a user reads the package README
- **THEN** it SHALL describe the package purpose
- **AND** it SHALL include installation instructions
- **AND** it SHALL provide usage examples
- **AND** it SHALL reference contributing guidelines

#### Scenario: Changelog tracking

- **WHEN** changes are made to the package
- **THEN** a `CHANGELOG.md` file SHALL exist
- **AND** it SHALL follow conventional changelog format
- **AND** it SHALL track version history

#### Scenario: README includes correct package name

- **GIVEN** a consumer reads the package README
- **THEN** the README SHALL reference `@m0n0lab/ts-types` in installation instructions
- **AND** it SHALL show import examples using `@m0n0lab/ts-types`
- **AND** it SHALL include npm-registry installation commands (npm/pnpm) with correct package name
- **AND** it SHALL NOT include JSR installation commands

#### Scenario: Source code comments reference correct package

- **GIVEN** generated type declarations from the build
- **THEN** the index.ts header comment SHALL mention `@m0n0lab/ts-types`
- **AND** test files SHALL reference `@m0n0lab/ts-types` in describe blocks

### Requirement: Release Configuration

The package SHALL be configured for automated releases with the new name.

#### Scenario: Release Please configuration

- **GIVEN** Release Please manages package versions
- **THEN** `release-please-config.json` SHALL have an entry for `packages/ts-types`
- **AND** the entry SHALL specify `package-name: "@m0n0lab/ts-types"`
- **AND** the entry SHALL NOT list `deno.json` in `extra-files`

## REMOVED Requirements

### Requirement: JSR Publishing Configuration

**Reason**: The monorepo no longer publishes to JSR; npm is the only registry.
**Migration**: Delete `packages/ts-types/deno.json`. Consumers install from npm (`pnpm add @m0n0lab/ts-types`); Deno users import `npm:@m0n0lab/ts-types`. Already published JSR versions stay frozen.
