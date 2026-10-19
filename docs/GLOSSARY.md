# Workspace

How the monolab monorepo classifies its projects and the tests each kind of project carries. Business language lives in each product's own glossary; this one covers the workspace itself.

## Language

### Project categories

**Published library**:
A package released to a public registry for consumers outside the monorepo.
_Avoid_: public package, lib.

**Business package**:
A package holding business rules and the use cases and adapters around them: a module package, a shared kernel, or an older layer package.
_Avoid_: domain package when meaning the category, since `qup-domain` is one package.

**Platform package**:
A package holding the runtime infrastructure that one product's business packages and apps share.
_Avoid_: infra package, shared package.

**App**:
A deployable web or API that composes business packages and exposes them to people or clients.
_Avoid_: frontend or backend when meaning the category.

**Plugin with code**:
A Claude Code plugin that ships executable scripts besides its prompts.

**Exempt project**:
A project with no executable logic of its own, only prompts or configuration, so it carries no tests.

### Testing

**Consumer entry point**:
Where a project's consumer enters it: a use case for a business package, the public API for a library, the rendered UI or a request for an app.

**System boundary**:
The edge where execution leaves the system: third-party APIs, databases, caches and other external services.

**Unit test**:
A test of a business model or of a library's internals, in isolation from everything around it.
_Avoid_: component test.

**Integration test**:
A test that enters through a use case or a library's public API and runs real code down to the system boundary, faking only what lies beyond it. The default kind of test: the fewest tests that reach the most real code.
_Avoid_: API test.

**Integration-platform test**:
An integration test that drives an app on its real platform, its UI in a browser or a request to its API, with the use cases faked. The use case is where an app's two halves meet: integration tests cover it down to the system boundary, integration-platform tests cover the app down to it. Unrelated to a platform package.
_Avoid_: platform integration test, platform test, browser test, UI test, component test.

**Harness**:
The layer an integration-platform test enters an app through: it launches the app on its platform, arranges the fakes and hides the framework, so the test reads as domain actions and checks. A base harness per app, one harness per entry point.
_Avoid_: test helper, test utils, test app.

**E2E test**:
A test that drives staging from the system's outermost edge, faking nothing, third-party APIs included.
_Avoid_: smoke test, acceptance test.

**Load test**:
A test that drives staging under a declared traffic profile (average load, stress, spike, soak or breakpoint) and fails on a threshold.
_Avoid_: stress test when meaning the kind, performance test, benchmark.

**Staging**:
A deployment of the system separate from production, with a database seeded for tests, where e2e and load tests run.
_Avoid_: test environment, pre-production.

**Test environment**:
Where a test runs, Node or a browser; never a kind of test nor a deployment.
_Avoid_: browser test.

**Dogfooding**:
Using every published library in at least one of the monorepo's own apps or packages, which is how its packaged build gets proven.

**Legacy test**:
A test written under the strategy that predates this policy, kept only until it is replaced and never to be imitated.
_Avoid_: old test.
