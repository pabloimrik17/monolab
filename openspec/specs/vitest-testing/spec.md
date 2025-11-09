# vitest-testing Specification

## Purpose
TBD - created by archiving change enhance-vitest-testing. Update Purpose after archive.
## Requirements
### Requirement: Test Project Organization

The system SHALL organize tests into separate Vitest projects (unit, integration, browser) within each package configuration, allowing independent execution and configuration per test type.

#### Scenario: Execute unit tests only

- **WHEN** developer runs `pnpm --filter @monolab/is-odd run test:unit`
- **THEN** only tests matching `**/*.test.ts` pattern are executed
- **AND** integration tests (`*.integration.ts`) are not executed
- **AND** coverage report is generated in `coverage/unit/` directory

#### Scenario: Execute integration tests independently

- **WHEN** developer runs `pnpm run test:integration:affected`
- **THEN** only affected packages with integration tests are executed
- **AND** only tests matching `**/*.integration.ts` pattern run
- **AND** coverage report is generated in `coverage/integration/` directory

#### Scenario: Different coverage thresholds per test type

- **WHEN** unit tests run with coverage
- **THEN** coverage thresholds SHALL be stricter (90% lines, 90% functions, 85% branches, 90% statements for utilities)
- **WHEN** integration tests run with coverage
- **THEN** coverage thresholds SHALL be relaxed (80% lines, 80% functions, 75% branches, 80% statements for utilities)

### Requirement: Test Command Naming Convention

The system SHALL provide standardized test commands with explicit naming indicating the test type, supporting watch mode variants for each type.

#### Scenario: Available test commands per package

- **WHEN** developer inspects package.json scripts
- **THEN** the following commands SHALL be available:
  - `test:unit` - Run unit tests
  - `test:unit:watch` - Run unit tests in watch mode
  - `test:integration` - Run integration tests
  - `test:integration:watch` - Run integration tests in watch mode
  - `test:types` - Run type tests
  - `test:types:watch` - Run type tests in watch mode
  - `test:ui` - Launch Vitest UI mode

#### Scenario: React packages have additional browser commands

- **WHEN** developer inspects react-hooks or react-clean package.json
- **THEN** additional browser test commands SHALL be available:
  - `test:browser` - Run browser tests
  - `test:browser:watch` - Run browser tests in watch mode

#### Scenario: Monorepo-level test commands

- **WHEN** developer runs commands from root directory
- **THEN** the following commands SHALL execute across all packages:
  - `pnpm run test:unit` - Run unit tests for all packages
  - `pnpm run test:unit:affected` - Run unit tests for affected packages only
  - `pnpm run test:types:affected` - Run type tests for affected packages only

### Requirement: UI Mode Support

The system SHALL provide interactive visual test debugging through Vitest UI mode accessible via script command.

#### Scenario: Launch UI mode

- **WHEN** developer runs `pnpm run test:ui`
- **THEN** Vitest UI SHALL start a development server
- **AND** UI SHALL be accessible at `http://localhost:51204/__vitest__/`
- **AND** tests SHALL run in watch mode automatically

#### Scenario: UI mode displays test hierarchy

- **WHEN** UI mode is running
- **THEN** all test files SHALL be displayed in a navigable tree structure
- **AND** developer can click individual tests to re-run them
- **AND** test results SHALL update in real-time

#### Scenario: UI mode shows coverage

- **WHEN** tests run with coverage enabled in UI mode
- **THEN** coverage reports SHALL be viewable within the UI interface

### Requirement: Type Testing

The system SHALL validate TypeScript types at compile-time using Vitest's built-in expectTypeOf to prevent type regressions.

#### Scenario: Type test file discovery

- **WHEN** type tests run via `pnpm run test:types`
- **THEN** only files matching `**/*.test-d.ts` pattern SHALL be executed
- **AND** files SHALL be statically analyzed without runtime execution

#### Scenario: Type assertions for utility functions

- **WHEN** type test validates isOdd function signature
- **THEN** expectTypeOf SHALL verify parameter type is number
- **AND** expectTypeOf SHALL verify return type is boolean
- **AND** ts-expect-error comments SHALL validate type errors occur for invalid types

#### Scenario: Type assertions for React hooks

- **WHEN** type test validates useDidMount hook
- **THEN** expectTypeOf SHALL verify callback parameter type
- **AND** expectTypeOf SHALL verify return type is void
- **AND** parameter types SHALL match expected function signatures

#### Scenario: Type tests in watch mode

- **WHEN** developer runs `pnpm run test:types:watch`
- **THEN** type tests SHALL re-run automatically on file changes
- **AND** type errors SHALL be reported in real-time

### Requirement: Browser Testing for React Packages

The system SHALL provide real browser testing capabilities for React packages using Playwright, executing tests in actual browser environments instead of Node.js with jsdom.

#### Scenario: Browser test execution

- **WHEN** developer runs `pnpm --filter @monolab/react-hooks run test:browser`
- **THEN** only files matching `**/*.browser.test.ts` or `**/*.browser.test.tsx` SHALL execute
- **AND** tests SHALL run in Chromium browser via Playwright
- **AND** tests SHALL run in headless mode
- **AND** coverage report SHALL be generated in `coverage/browser/` directory

#### Scenario: Browser test with React component

- **WHEN** browser test renders React component using vitest-browser-react
- **THEN** component SHALL render in real browser DOM
- **AND** test SHALL have access to actual window and document objects
- **AND** test SHALL use browser-native APIs (localStorage, IndexedDB, etc.)

#### Scenario: Browser testing scope

- **WHEN** packages are checked for browser test support
- **THEN** react-hooks and react-clean packages SHALL have browser test capability
- **AND** utility packages (is-odd, is-even, ts-configs) SHALL NOT have browser test configurations

### Requirement: Concurrent Test Execution

The system SHALL support concurrent test execution within test files using maxConcurrency configuration to optimize test performance.

#### Scenario: Maximum concurrent tests configuration

- **WHEN** Vitest runs tests marked with test.concurrent
- **THEN** up to 10 tests SHALL run simultaneously (maxConcurrency: 10)
- **AND** tests exceeding this limit SHALL queue until slots become available

#### Scenario: Concurrent tests use local expect

- **WHEN** test is marked as concurrent
- **THEN** test MUST use expect from local test context
- **AND** this prevents test pollution between concurrent tests

#### Scenario: Suite-level concurrency

- **WHEN** describe.concurrent marks entire suite
- **THEN** all tests within that suite SHALL start in parallel
- **AND** maxConcurrency limit SHALL still apply

### Requirement: CI Test Sharding

The system SHALL distribute tests across multiple CI jobs using Vitest's sharding feature to reduce total CI execution time.

#### Scenario: Shard configuration in CI

- **WHEN** CI pipeline runs tests
- **THEN** tests SHALL be distributed across 3 parallel jobs (shards 1/3, 2/3, 3/3)
- **AND** each shard SHALL execute only its designated portion of tests
- **AND** shard jobs SHALL run concurrently in GitHub Actions matrix

#### Scenario: Shard-specific test execution

- **WHEN** shard 1/3 executes
- **THEN** it SHALL run approximately 33% of total tests
- **WHEN** shard 2/3 executes
- **THEN** it SHALL run a different 33% of tests with no overlap with shard 1

#### Scenario: Coverage merge from shards

- **WHEN** all shards complete and upload coverage to Codecov
- **THEN** each shard SHALL upload coverage with flag `shard-1`, `shard-2`, `shard-3`
- **AND** Codecov SHALL automatically merge all shard coverage reports
- **AND** final coverage report SHALL be complete and accurate
- **AND** no manual merge step SHALL be required

#### Scenario: Shard failure handling

- **WHEN** one shard fails to upload coverage
- **THEN** CI SHALL continue (fail_ci_if_error: false)
- **AND** other shards SHALL still upload their coverage
- **AND** partial coverage SHALL be available in Codecov

### Requirement: Workspace Configuration Inheritance

The system SHALL centralize common test configuration in vitest.workspace.ts with automatic inheritance to package configurations using extends mechanism.

#### Scenario: Shared cleanup configuration

- **WHEN** vitest.workspace.ts defines cleanup flags
- **THEN** clearMocks SHALL be set to true globally
- **AND** restoreMocks SHALL be set to true globally
- **AND** unstubEnvs SHALL be set to true globally
- **AND** unstubGlobals SHALL be set to true globally
- **AND** all packages SHALL inherit these settings via extends: true

#### Scenario: Automatic mock cleanup before each test

- **WHEN** a test runs in any package
- **THEN** mock history SHALL be cleared automatically before the test
- **AND** spies SHALL be restored to original implementations
- **AND** stubbed environment variables SHALL be cleaned up
- **AND** stubbed globals SHALL be cleaned up
- **AND** developer does NOT need to manually call cleanup functions

#### Scenario: Package config extends workspace

- **WHEN** package vitest.config.ts uses defineProject with extends: true
- **THEN** package SHALL inherit all workspace-level settings
- **AND** package MAY override specific settings if needed
- **AND** package-specific settings take precedence over workspace settings

### Requirement: File Naming Conventions

The system SHALL use standardized file naming patterns to distinguish test types, enabling automatic discovery and filtering by test project configurations.

#### Scenario: Unit test file naming

- **WHEN** developer creates unit tests
- **THEN** files SHALL use `*.test.ts` or `*.test.tsx` extension
- **AND** these files SHALL be discovered by unit test project
- **AND** these files SHALL NOT be discovered by integration or type test projects

#### Scenario: Integration test file naming

- **WHEN** developer creates integration tests
- **THEN** files SHALL use `*.integration.ts` extension
- **AND** these files SHALL be discovered by integration test project
- **AND** these files SHALL NOT be discovered by unit test project

#### Scenario: Type test file naming

- **WHEN** developer creates type tests
- **THEN** files SHALL use `*.test-d.ts` extension
- **AND** these files SHALL be discovered by type checking
- **AND** these files SHALL be statically analyzed without execution

#### Scenario: Browser test file naming

- **WHEN** developer creates browser tests for React packages
- **THEN** files SHALL use `*.browser.test.ts` or `*.browser.test.tsx` extension
- **AND** these files SHALL be discovered by browser test project
- **AND** these files SHALL execute in real browser environment via Playwright

#### Scenario: File organization

- **WHEN** tests are created in package source directory
- **THEN** tests SHALL be co-located with implementation files
- **AND** test type SHALL be identifiable by file extension
- **AND** example structure: `src/index.ts`, `src/index.test.ts`, `src/index.integration.ts`, `src/index.test-d.ts`

### Requirement: Vitest Configuration Migration

The system SHALL migrate package configurations from defineConfig to defineProject to support workspace inheritance and project-based organization.

#### Scenario: Package config uses defineProject

- **WHEN** package vitest.config.ts is inspected
- **THEN** it SHALL use `defineProject` instead of `defineConfig`
- **AND** it SHALL include `extends: true` at the test level
- **AND** it SHALL define projects array with test type configurations

#### Scenario: Reporters remain at package level

- **WHEN** package defines test projects
- **THEN** reporters configuration SHALL remain at package test level (not in projects)
- **AND** JUnit outputFile configuration SHALL remain at package test level
- **AND** all projects SHALL share the same reporters

#### Scenario: Coverage configuration per project

- **WHEN** test projects are defined
- **THEN** each project MAY have its own coverage configuration
- **AND** coverage provider, reporter, and reportsDirectory MAY differ per project
- **AND** coverage thresholds SHALL be specific to each project type

