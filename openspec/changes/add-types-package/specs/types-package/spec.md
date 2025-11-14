# Types Package Specification

## ADDED Requirements

### Requirement: Package Structure

The `@monolab/ts-types` package SHALL provide a standard library structure for sharing TypeScript type definitions across the monorepo.

#### Scenario: Package directory layout

- **WHEN** the package is created
- **THEN** it SHALL have directory structure: `packages/ts-types/src/` for source code
- **AND** it SHALL have `packages/ts-types/dist/` for compiled output
- **AND** it SHALL include `project.json` for Nx integration without Nx plugins

#### Scenario: Source organization

- **WHEN** types are added to the package
- **THEN** they SHALL be exported through `src/index.ts` entry point
- **AND** the package SHALL support tree-shaking via `sideEffects: false`

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
- **THEN** `package.json` SHALL have name `@monolab/ts-types`
- **AND** initial version SHALL be `0.1.0`
- **AND** author field SHALL be set to `Pablo F.G.`

#### Scenario: Publishing configuration

- **WHEN** preparing for publication
- **THEN** `engines` field SHALL require Node 24.11.0 and pnpm 10.19.0
- **AND** `packageManager` SHALL specify pnpm 10.19.0
- **AND** `publishConfig` SHALL set `access: "public"`
- **AND** `publishConfig` SHALL use npm registry URL

### Requirement: JSR Publishing Configuration

The package SHALL be configured for publishing to JSR (JavaScript Registry) with proper metadata.

#### Scenario: JSR configuration file

- **WHEN** setting up JSR publishing
- **THEN** a `jsr.json` file SHALL exist in package root
- **AND** it SHALL have name `@monolab/ts-types`
- **AND** version SHALL match `package.json` version
- **AND** `license` field SHALL be set to `MIT`

#### Scenario: JSR exports

- **WHEN** JSR processes the package
- **THEN** `jsr.json` SHALL have `exports` field pointing to `./src/index.ts`
- **AND** it SHALL export source TypeScript files (not compiled)
- **AND** it SHALL include `imports` field for JSR dependencies (initially empty)

### Requirement: Documentation

The package SHALL provide comprehensive documentation for consumers and contributors.

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
