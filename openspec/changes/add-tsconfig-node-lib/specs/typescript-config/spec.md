# TypeScript Configuration

## ADDED Requirements

### Requirement: Node Library Configuration
The monorepo SHALL provide a TypeScript configuration file (`tsconfig.node.lib.json`) that extends the node base configuration with settings optimized for publishable Node.js libraries.

#### Scenario: Extends node base configuration
- **WHEN** `tsconfig.node.lib.json` is used by a Node.js library
- **THEN** it extends from `tsconfig.node.base.json`
- **AND** inherits all Node.js-optimized settings from the base config

#### Scenario: Declaration file generation
- **WHEN** a Node.js library uses `tsconfig.node.lib.json`
- **THEN** declaration files (.d.ts) are generated
- **AND** declaration maps are generated for better IDE support
- **AND** the output is suitable for publishing to JSR

#### Scenario: Composite builds support
- **WHEN** using TypeScript project references
- **THEN** composite mode is enabled
- **AND** incremental builds work correctly across library dependencies

#### Scenario: Compatible with utility libraries
- **WHEN** utility libraries (is-even, is-odd) use this configuration
- **THEN** they compile successfully with proper type definitions
- **AND** pass @arethetypeswrong/cli validation
- **AND** produce Node.js-compatible, tree-shakeable output
