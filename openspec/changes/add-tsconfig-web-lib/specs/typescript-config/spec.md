# TypeScript Configuration

## ADDED Requirements

### Requirement: Web Library Configuration
The monorepo SHALL provide a TypeScript configuration file (`tsconfig.web.lib.json`) that extends the web base configuration with settings optimized for publishable web libraries.

#### Scenario: Extends web base configuration
- **WHEN** `tsconfig.web.lib.json` is used by a web library
- **THEN** it extends from `tsconfig.web.base.json`
- **AND** inherits all browser-optimized settings from the base config

#### Scenario: Declaration file generation
- **WHEN** a web library uses `tsconfig.web.lib.json`
- **THEN** declaration files (.d.ts) are generated
- **AND** declaration maps are generated for better IDE support
- **AND** the output is suitable for publishing to JSR

#### Scenario: Composite builds support
- **WHEN** using TypeScript project references
- **THEN** composite mode is enabled
- **AND** incremental builds work correctly across library dependencies

#### Scenario: Compatible with React libraries
- **WHEN** React component libraries use this configuration
- **THEN** they compile successfully with proper type definitions
- **AND** pass @arethetypeswrong/cli validation
- **AND** produce tree-shakeable, bundler-friendly output
