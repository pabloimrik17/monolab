# Types Package Specification

## Requirements

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

- **GIVEN** the types package has JSR publishing enabled
- **THEN** `deno.json` SHALL exist at the package root
- **AND** it SHALL have name `@m0n0lab/ts-types`
- **AND** it SHALL have a valid exports configuration

#### Scenario: Nx project configuration

- **GIVEN** the types package is part of the Nx workspace
- **THEN** `project.json` SHALL have name `@m0n0lab/ts-types`
- **AND** it SHALL be tagged with `npm:public`
- **AND** it SHALL have appropriate build, lint, and test targets

### Requirement: TypeScript Configuration

The package SHALL use TypeScript with strict compilation settings following monorepo conventions.

#### Scenario: TypeScript compilation

- **WHEN** building the package
- **THEN** `tsconfig.json` SHALL extend `../ts-configs/tsconfig.node.lib.json`
- **AND** it SHALL compile from `src/` to `dist/` directory
- **AND** it SHALL generate `.d.ts` declaration files
- **AND** it SHALL support composite builds with declaration maps

#### Scenario: Type checking

- **WHEN** running type checks
- **THEN** the package SHALL validate all TypeScript code with `tsc --noEmit`
- **AND** it SHALL enforce strict mode rules

### Requirement: ESM Export Configuration

The package SHALL provide ES module exports compatible with modern JavaScript tooling.

#### Scenario: Package exports

- **WHEN** consuming the package from another project
- **THEN** `package.json` SHALL have `type: "module"`
- **AND** the `exports` field SHALL map `.` to `./dist/index.js` for code
- **AND** the `exports` field SHALL map types to `./dist/index.d.ts`
- **AND** `main` field SHALL point to `./dist/index.js`
- **AND** `types` field SHALL point to `./dist/index.d.ts`

#### Scenario: Published files

- **WHEN** the package is published
- **THEN** the `files` array SHALL include: `dist/`, `README.md`, `CHANGELOG.md`, `LICENSE`
- **AND** source files (`src/`) SHALL NOT be included in published package
- **AND** build artifacts SHALL be tree-shakeable

### Requirement: Build System

The package SHALL provide automated build and validation scripts.

#### Scenario: Build execution

- **WHEN** running the build command
- **THEN** `pnpm run build` SHALL execute `tsc -b` for composite build
- **AND** it SHALL output JavaScript and declaration files to `dist/`
- **AND** build SHALL fail on TypeScript errors

#### Scenario: Development workflow

- **WHEN** developing the package
- **THEN** `pnpm run typecheck` SHALL validate types without emitting files
- **AND** standard lint scripts SHALL be available (eslint, knip)
- **AND** standard test scripts SHALL be available (vitest)

### Requirement: Package Metadata

The package SHALL include proper versioning, authoring, and publishing configuration.

#### Scenario: Package identification

- **WHEN** the package is initialized
- **THEN** `package.json` SHALL have name `@m0n0lab/ts-types`
- **AND** initial version SHALL be `0.1.0` (follows semver after initial release)
- **AND** author field SHALL be set to `Pablo F.G.`

#### Scenario: Publishing configuration

- **WHEN** preparing for publication
- **THEN** `engines` field SHALL require Node `^20.18.0 || >=22.0.0` and pnpm 10.27.0
- **AND** `packageManager` SHALL specify pnpm 10.27.0
- **AND** `publishConfig` SHALL set `access: "public"`
- **AND** `publishConfig` SHALL use npm registry URL

### Requirement: JSR Publishing Configuration

The package SHALL be configured for publishing to JSR (JavaScript Registry) via Deno workspace pattern.

#### Scenario: JSR configuration file

- **WHEN** setting up JSR publishing
- **THEN** a `deno.json` file SHALL exist in package root
- **AND** it SHALL have name `@m0n0lab/ts-types`
- **AND** version SHALL match `package.json` version
- **AND** `license` field SHALL be set to `MIT`

#### Scenario: JSR exports

- **WHEN** JSR processes the package
- **THEN** `deno.json` SHALL have `exports` field pointing to `./src/index.ts`
- **AND** it SHALL export source TypeScript files (not compiled)

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
- **AND** it SHALL include npm and JSR installation commands with correct package name

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
- **AND** it SHALL include `extra-files: ["deno.json"]` for synchronized versioning

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
