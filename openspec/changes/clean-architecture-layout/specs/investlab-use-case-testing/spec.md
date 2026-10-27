## MODIFIED Requirements

### Requirement: Integration tests colocated per side

Use-case integration tests SHALL live next to their use case in `application/server/use-case/` or `application/client/use-case/` of the module package, named after it as `<use case>.use-case.integration.ts`. Each side SHALL have one `vitest-integration-setup.ts` and one `given.ts` in `src/testing/<side>/`, and the setup file SHALL be listed in `setupFiles` of that side's vitest integration project. `src/testing/` SHALL hold no harness: only these files, the server's global setup and the builders.

#### Scenario: Running a module's integration tests

- **WHEN** `nx run @m0n0lab/investlab-portfolio:test:integration` runs
- **THEN** the server and client integration tests of the portfolio module run, each side with its own setup file

#### Scenario: Test named after its use case

- **WHEN** the integration test of the client quote list use case is located
- **THEN** it is `packages/investlab-quotes/src/application/client/use-case/quote-list.use-case.integration.ts`
