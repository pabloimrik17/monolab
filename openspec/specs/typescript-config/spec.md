# typescript-config Specification

## Purpose
TBD - created by archiving change add-tsconfig-web-app. Update Purpose after archive.
## Requirements
### Requirement: Web Application Configuration
The monorepo SHALL provide a TypeScript configuration file (`tsconfig.web.app.json`) that extends the web base configuration with settings optimized for web applications.

#### Scenario: Extends web base configuration
- **WHEN** `tsconfig.web.app.json` is used by a web application
- **THEN** it extends from `tsconfig.web.base.json`
- **AND** inherits all browser-optimized settings from the base config

#### Scenario: Application-specific settings
- **WHEN** a web application uses `tsconfig.web.app.json`
- **THEN** declaration file generation is disabled (declaration: false)
- **AND** the configuration is optimized for bundled output
- **AND** incremental compilation is enabled for faster rebuilds

#### Scenario: Debugging support
- **WHEN** developing a web application
- **THEN** source maps are enabled for debugging
- **AND** the output is compatible with modern bundlers like Vite

#### Scenario: Compatible with demo app
- **WHEN** the demo SolidJS app uses this configuration
- **THEN** it compiles successfully
- **AND** produces optimized output for production builds

### Requirement: Web Base Configuration
The monorepo SHALL provide a base TypeScript configuration file (`tsconfig.web.base.json`) optimized for web/browser environments that can be extended by web applications and libraries.

#### Scenario: Browser environment support
- **WHEN** a web project extends from `tsconfig.web.base.json`
- **THEN** the configuration includes DOM type definitions
- **AND** the target is set to a modern ES version compatible with modern browsers
- **AND** the lib includes DOM and modern ES features

#### Scenario: ESM module support
- **WHEN** a web project extends from `tsconfig.web.base.json`
- **THEN** the module system is set to ESNext for ESM support
- **AND** moduleResolution is set to "bundler" for compatibility with modern bundlers

#### Scenario: React JSX support
- **WHEN** a React-based web project extends from `tsconfig.web.base.json`
- **THEN** JSX is properly configured with react-jsx transform
- **AND** React components can be compiled without additional JSX configuration

#### Scenario: Extensibility
- **WHEN** projects need to extend this configuration
- **THEN** they can use the "extends" field in their tsconfig.json
- **AND** override specific options as needed for their use case

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

### Requirement: Node Application Configuration
The monorepo SHALL provide a TypeScript configuration file (`tsconfig.node.app.json`) that extends the node base configuration with settings optimized for Node.js applications.

#### Scenario: Extends node base configuration
- **WHEN** `tsconfig.node.app.json` is used by a Node.js application
- **THEN** it extends from `tsconfig.node.base.json`
- **AND** inherits all Node.js-optimized settings from the base config

#### Scenario: Application-specific settings
- **WHEN** a Node.js application uses `tsconfig.node.app.json`
- **THEN** declaration file generation is disabled (declaration: false)
- **AND** the configuration is optimized for executable output
- **AND** incremental compilation is enabled for faster rebuilds

#### Scenario: Debugging support
- **WHEN** developing a Node.js application
- **THEN** source maps are enabled for debugging
- **AND** the output is compatible with Node.js 24.11.0 runtime

#### Scenario: Compatible with Hono APIs
- **WHEN** a Hono API project uses this configuration
- **THEN** it compiles successfully
- **AND** produces optimized output for production deployment

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

### Requirement: Node Base Configuration
The monorepo SHALL provide a base TypeScript configuration file (`tsconfig.node.base.json`) optimized for Node.js environments that can be extended by backend applications, CLI tools, and Node.js libraries.

#### Scenario: Node.js environment support
- **WHEN** a Node.js project extends from `tsconfig.node.base.json`
- **THEN** the configuration excludes DOM type definitions
- **AND** the target is set to a modern ES version compatible with Node.js 24.11.0
- **AND** the lib includes modern ES features without browser-specific APIs

#### Scenario: Node.js module support
- **WHEN** a Node.js project extends from `tsconfig.node.base.json`
- **THEN** the module system is set to NodeNext for proper Node.js ESM/CJS handling
- **AND** moduleResolution is automatically configured by TypeScript for Node.js compatibility

#### Scenario: No JSX configuration
- **WHEN** a Node.js project extends from `tsconfig.node.base.json`
- **THEN** JSX settings are not included
- **AND** the configuration focuses on server-side TypeScript features

#### Scenario: Extensibility
- **WHEN** projects need to extend this configuration
- **THEN** they can use the "extends" field in their tsconfig.json
- **AND** override specific options as needed for their use case

