# Spec Delta

## MODIFIED Requirements

### Requirement: HTTP Client Package Structure

The system SHALL provide an `@m0n0lab/http-client` package with complete directory structure, source files, and configuration following monorepo standards.

#### Scenario: Package directory exists with correct structure

- **WHEN** the http-client package is created
- **THEN** it SHALL contain the following directories and files:
  - `packages/http-client/src/` (source code)
  - `packages/http-client/dist/` (build output, generated)
  - `packages/http-client/coverage/` (test coverage, generated)
  - `packages/http-client/package.json` (npm metadata)
  - `packages/http-client/project.json` (Nx configuration)
  - `packages/http-client/tsconfig.json` (TypeScript configuration)
  - `packages/http-client/vitest.config.ts` (test configuration)
  - `packages/http-client/README.md` (package documentation)
  - `packages/http-client/CHANGELOG.md` (version history)

#### Scenario: Package has correct npm metadata

- **WHEN** `packages/http-client/package.json` is created
- **THEN** it SHALL include:
  - Package name: `@m0n0lab/http-client`
  - Initial version: `0.1.0`
  - Type: `"module"` (ESM only)
  - Exports field pointing to `./dist/index.js` and `./dist/index.d.ts`
  - Repository metadata with directory field
  - Node.js engine: `^20.18.0 || >=22.0.0`
  - pnpm version: `10.27.0`
  - Scripts for build, lint, test, typecheck
  - publishConfig with npm registry information

#### Scenario: Package has JSR configuration

- **WHEN** the http-client package is inspected
- **THEN** `packages/http-client/deno.json` and `packages/http-client/jsr.json` SHALL NOT exist
- **AND** the package SHALL NOT be published to JSR

#### Scenario: Package has Nx project configuration

- **WHEN** `packages/http-client/project.json` is created
- **THEN** it SHALL include:
  - Package name: `@m0n0lab/http-client`
  - Source root: `packages/http-client/src`
  - Project type: `library`

### Requirement: Package Documentation

The system SHALL provide comprehensive documentation for the http-client package including README, changelog, and inline code comments.

#### Scenario: README describes package purpose and future roadmap

- **WHEN** `packages/http-client/README.md` is created
- **THEN** it SHALL describe the package purpose: abstracted HTTP client for web and Node.js
- **AND** it SHALL state that implementation is currently placeholder/foundation
- **AND** it SHALL outline future roadmap: neverthrow and effect-ts wrappers
- **AND** it SHALL include installation instructions for npm only (no JSR)

#### Scenario: CHANGELOG tracks version history

- **WHEN** `packages/http-client/CHANGELOG.md` is created
- **THEN** it SHALL include an "Unreleased" section
- **AND** it SHALL follow conventional changelog format
- **AND** release-please SHALL automatically update it on version bumps

#### Scenario: Main repository README acknowledges new package

- **WHEN** the main repository README is updated
- **THEN** it SHALL mention `http-client` package in the package list
- **AND** it SHALL describe it as an HTTP client abstraction for web and Node.js
