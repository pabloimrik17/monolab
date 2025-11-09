# typescript-configuration Specification

## Purpose
TBD - created by archiving change define-base-tsconfig. Update Purpose after archive.
## Requirements
### Requirement: Configuration File Structure

The base TypeScript configuration SHALL be organized into 4 logical groups with inline documentation explaining each group's purpose.

#### Scenario: Grouped organization

- **WHEN** a developer opens `tsconfig.base.json`
- **THEN** they SHALL see options organized into: Language & Target, Strictness, ESM Interop & Isolation, and Performance groups
- **AND** each group SHALL have an inline comment describing its purpose

#### Scenario: Documentation clarity

- **WHEN** a developer reads the configuration file
- **THEN** they SHALL understand which options control language features, type safety, interop, or performance without external documentation

### Requirement: Language and Target Configuration

The base configuration SHALL target stable modern JavaScript with ES2022 compilation output and ES2024 API types.

#### Scenario: Runtime compatibility

- **WHEN** TypeScript compiles code using the base config
- **THEN** the output SHALL target ES2022 for maximum runtime compatibility
- **AND** developers SHALL have access to ES2024 type definitions during development

#### Scenario: Module and JSON imports

- **WHEN** code imports `.js` files via `allowJs`
- **THEN** TypeScript SHALL successfully process JavaScript imports
- **WHEN** code imports `.json` files via `resolveJsonModule`
- **THEN** TypeScript SHALL successfully process JSON imports with proper typing

#### Scenario: Module detection

- **WHEN** TypeScript processes files with `moduleDetection: "force"`
- **THEN** block-scoped variable redeclaration errors SHALL be prevented
- **AND** all files SHALL be treated as modules

### Requirement: Maximum Type Safety

The base configuration SHALL enable comprehensive strictness including all flags in `strict` mode plus additional beyond-strict checks.

#### Scenario: Core strict mode

- **WHEN** `strict: true` is enabled
- **THEN** all core strict flags SHALL be active: noImplicitAny, strictNullChecks, strictFunctionTypes, strictBindCallApply, strictPropertyInitialization, noImplicitThis, alwaysStrict

#### Scenario: Unused code detection

- **WHEN** code contains unused variables
- **THEN** TypeScript SHALL produce a compilation error via `noUnusedLocals`
- **WHEN** functions have unused parameters
- **THEN** TypeScript SHALL produce a compilation error via `noUnusedParameters`

#### Scenario: Array and object safety

- **WHEN** code accesses array or object properties by index via `noUncheckedIndexedAccess`
- **THEN** TypeScript SHALL type the result as `T | undefined`
- **AND** developers SHALL be forced to handle undefined cases

#### Scenario: Optional property exactness

- **WHEN** code uses optional properties with `exactOptionalPropertyTypes`
- **THEN** TypeScript SHALL distinguish between `{x?: number}` and `{x: number | undefined}`
- **AND** developers SHALL not be able to pass explicit `undefined` to optional properties

#### Scenario: Control flow completeness

- **WHEN** functions have code paths that don't return via `noImplicitReturns`
- **THEN** TypeScript SHALL produce a compilation error
- **WHEN** code contains unreachable statements via `allowUnreachableCode: false`
- **THEN** TypeScript SHALL produce a compilation error

#### Scenario: Class inheritance safety

- **WHEN** methods override parent class methods without `override` keyword via `noImplicitOverride`
- **THEN** TypeScript SHALL produce a compilation error
- **AND** developers SHALL explicitly mark overrides

#### Scenario: Index signature access

- **WHEN** code accesses properties defined by index signatures via `noPropertyAccessFromIndexSignature`
- **THEN** TypeScript SHALL require bracket notation
- **AND** dot notation SHALL produce a compilation error

### Requirement: ESM Interop and Isolation

The base configuration SHALL ensure compatibility with modern JavaScript module systems and bundler tools.

#### Scenario: CommonJS and ESM interop

- **WHEN** code imports CommonJS modules with `esModuleInterop`
- **THEN** TypeScript SHALL provide seamless interop between module systems
- **AND** default imports from CommonJS SHALL work correctly

#### Scenario: Isolated module transpilation

- **WHEN** bundlers transpile files individually with `isolatedModules`
- **THEN** TypeScript SHALL prevent unsafe language features
- **AND** all code SHALL be safe for per-file transpilation

#### Scenario: Explicit type syntax

- **WHEN** code imports or exports types with `verbatimModuleSyntax`
- **THEN** TypeScript SHALL require explicit `import type` and `export type` syntax
- **AND** type-only imports SHALL be clearly distinguished from value imports

#### Scenario: Cross-platform filename safety

- **WHEN** code references files with inconsistent casing via `forceConsistentCasingInFileNames`
- **THEN** TypeScript SHALL produce a compilation error
- **AND** case-sensitive and case-insensitive filesystems SHALL behave consistently

### Requirement: Build Performance Optimization

The base configuration SHALL optimize compilation speed for monorepo usage through incremental builds and project references.

#### Scenario: Incremental compilation

- **WHEN** TypeScript compiles with `incremental: true`
- **THEN** a `.tsbuildinfo` file SHALL be created
- **AND** subsequent builds SHALL use cached information for faster compilation

#### Scenario: Project references support

- **WHEN** projects use `composite: true`
- **THEN** TypeScript project references SHALL be enabled
- **AND** monorepo projects SHALL support cross-project dependencies with proper build ordering

#### Scenario: Fast compilation

- **WHEN** TypeScript compiles with `skipLibCheck: true`
- **THEN** `.d.ts` files SHALL be skipped during type checking
- **AND** compilation time SHALL be significantly reduced

### Requirement: Platform Agnosticism

The base configuration SHALL NOT include platform-specific settings, enabling it to serve as foundation for both web and Node.js configurations.

#### Scenario: No module resolution

- **WHEN** the base config is parsed
- **THEN** it SHALL NOT contain `module` or `moduleResolution` options
- **AND** derived platform configs SHALL be responsible for setting module strategy

#### Scenario: No runtime library types

- **WHEN** the base config specifies `lib`
- **THEN** it SHALL only include core JavaScript types (ES2024)
- **AND** it SHALL NOT include DOM, DOM.Iterable, or Node-specific types

#### Scenario: No output configuration

- **WHEN** the base config is parsed
- **THEN** it SHALL NOT contain `outDir`, `declaration`, `declarationMap`, `sourceMap`, or `noEmit` options
- **AND** derived usage configs (lib/app) SHALL be responsible for output settings

### Requirement: Extensibility and Overrides

The base configuration SHALL be extensible by derived configurations while allowing project-specific overrides.

#### Scenario: Configuration extension

- **WHEN** a derived config extends the base via `"extends": "./tsconfig.base.json"`
- **THEN** all base options SHALL be inherited
- **AND** the derived config SHALL be able to add or override any option

#### Scenario: Project-level overrides

- **WHEN** a project extends a derived config and overrides a strict flag
- **THEN** the override SHALL take precedence
- **AND** projects SHALL be able to temporarily relax strictness during migration

#### Scenario: Additive configuration

- **WHEN** a derived config adds options not present in base (like `module`, `lib` extensions)
- **THEN** the options SHALL be added without conflicts
- **AND** the final merged configuration SHALL be valid

### Requirement: Configuration Hierarchy Support

The base configuration SHALL serve as the foundation for a multi-level hierarchy of specialized configurations.

#### Scenario: Platform-specific extension

- **WHEN** web-base or node-base configs extend the base
- **THEN** they SHALL add platform-specific module resolution and library types
- **AND** they SHALL NOT need to duplicate base settings

#### Scenario: Usage-specific extension

- **WHEN** lib or app configs extend platform configs
- **THEN** they SHALL add usage-specific output settings
- **AND** they SHALL inherit all base and platform settings

#### Scenario: Minimal derived configs

- **WHEN** platform configs are created
- **THEN** they SHALL add no more than 8 additional options
- **WHEN** usage configs are created
- **THEN** they SHALL add no more than 3 additional options
- **AND** the hierarchy SHALL minimize duplication across configs

