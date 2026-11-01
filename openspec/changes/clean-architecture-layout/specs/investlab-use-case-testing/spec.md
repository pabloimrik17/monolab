## MODIFIED Requirements

### Requirement: Integration tests colocated per side

Use-case integration tests SHALL live next to their use case in `application/server/use-case/` or `application/client/use-case/` of the module package, named after it as `<use case>.use-case.integration.ts`. Each side SHALL have one `vitest-integration-setup.ts` and one `given.ts` in `src/testing/<side>/`, and the setup file SHALL be listed in `setupFiles` of that side's vitest integration project. `src/testing/` SHALL hold no harness: only these files, the server's global setup and the builders.

#### Scenario: Running a module's integration tests

- **WHEN** `nx run @m0n0lab/investlab-portfolio:test:integration` runs
- **THEN** the server and client integration tests of the portfolio module run, each side with its own setup file

#### Scenario: Test named after its use case

- **WHEN** the integration test of the client quote list use case is located
- **THEN** it is `packages/investlab-quotes/src/application/client/use-case/quote-list.use-case.integration.ts`

### Requirement: Setup builds the real composition

Each side's setup SHALL build the container (on the server side per test: built in `beforeEach`, released with `await container.unbindAllAsync()` in `afterEach`) from the platform module and the module under test, binding only a constant `Config` that points to the test infrastructure. Tests SHALL resolve the use case with `container.get(<token>)` in a `beforeEach` into a `let` variable, both inside the file's root `describe`, which is named after the use case class, with no helper function wrapping the resolution.

#### Scenario: Test resolves the use case per test

- **WHEN** a test file for the portfolio item create use case runs
- **THEN** it opens with `describe("PortfolioItemCreateUseCase")`, declares `let` for the use case inside it and assigns `container.get(PORTFOLIO.ItemCreate)` in its `beforeEach`
