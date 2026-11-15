## ADDED Requirements

### Requirement: A test file opens with one describe named after its unit

Every test file, of every kind, legacy and type tests included, SHALL open with exactly one root `describe` named after the unit under test: the exact exported symbol it tests, a class or a function. A file that tests several exported symbols SHALL name its root after the module, without suffix, with one nested `describe` per symbol holding flat tests. Otherwise each behaviour SHALL have at most one nested `describe`. No deeper `describe` SHALL exist. Review SHALL check the root `describe` name.

#### Scenario: Use-case test

- **WHEN** the server integration test of the portfolio item create use case is read
- **THEN** it opens with `describe("PortfolioItemCreateUseCase")` and groups each behaviour in at most one nested `describe`

#### Scenario: API routes test

- **WHEN** the integration-platform test of the portfolio item routes is read
- **THEN** it opens with `describe("portfolioItemRoutes")` and each endpoint is one nested `describe`

#### Scenario: Several exported symbols

- **WHEN** `packages/ts-types/src/nullable.test.ts`, which tests `isNullable` and `isNonNullable`, is read
- **THEN** it opens with `describe("nullable")`, with one nested `describe` per function holding flat `it`s

### Requirement: Test setup lives inside the root describe

A test file's setup (`let` declarations, `beforeEach`, `afterEach`, `beforeAll`, `afterAll`) SHALL live inside its root `describe`, never at file level. Global setup files (`vitest-*-setup.ts`) register project-wide hooks and are exempt.

#### Scenario: Use case resolved per test

- **WHEN** a use-case integration test resolves its use case before each test
- **THEN** its `let` and `beforeEach` sit inside the root `describe`

#### Scenario: Global setup file

- **WHEN** a `vitest-integration-setup.ts` registers `beforeEach` and `afterEach` at file level
- **THEN** it complies, and `lint:eslint` reports nothing for it

### Requirement: ESLint enforces the test structure

ESLint SHALL check every test file kind with `@vitest/eslint-plugin`: `vitest/require-top-level-describe` allowing one top-level `describe`, and `vitest/max-nested-describe` with a maximum of 2. Test-support files (harnesses, givens, builders, setup files) SHALL NOT get these two rules.

#### Scenario: File-level hook or test

- **WHEN** a test file declares a `beforeEach`, an `it` or a second `describe` outside its root `describe`
- **THEN** `lint:eslint` fails with `vitest/require-top-level-describe`

#### Scenario: Third describe level

- **WHEN** a test nests a `describe` inside a behaviour's `describe`
- **THEN** `lint:eslint` fails with `vitest/max-nested-describe`

### Requirement: Test files follow the fleet's Vitest lint rules

ESLint SHALL apply to every test file the fleet's Vitest rule values: `vitest/valid-expect` and `vitest/valid-title` as errors, `vitest/no-focused-tests` as a fixable warning and `vitest/no-disabled-tests` as a warning. No Vitest preset and no `settings.vitest` SHALL be configured.

#### Scenario: Focused test left behind

- **WHEN** a test is committed as `it.only`
- **THEN** `lint:eslint` warns with `vitest/no-focused-tests`, and `eslint --fix` removes the `.only`

#### Scenario: Missing assertion call

- **WHEN** a test writes `expect(value)` without a matcher
- **THEN** `lint:eslint` fails with `vitest/valid-expect`

## MODIFIED Requirements

### Requirement: Integration-platform tests are flat

An integration-platform test SHALL hold only Arrange, Act and Assert steps over harness methods, SHALL launch its harness itself with `await using`, and SHALL keep every assertion in the test, never inside the harness. No `beforeEach` or `afterEach` SHALL manage a harness.

#### Scenario: Test shape

- **WHEN** an integration-platform test is read
- **THEN** it launches the harness with `await using`, calls domain-named methods and asserts with `expect`, with at most two `describe` levels: the unit, then the behaviour
