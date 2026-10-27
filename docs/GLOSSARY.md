# Workspace

How the monolab monorepo classifies its projects, how Clean Architecture code is divided inside them, and the tests each kind of project carries. Business language lives in each product's own glossary; this one covers the workspace itself.

## Language

### Project categories

**Published library**:
A package released to a public registry for consumers outside the monorepo.
_Avoid_: public package, lib.

**Business package**:
A package holding business rules and the use cases and adapters around them: a module package, a core package, or an older layer package.
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

### Clean Architecture

**Layer**:
One of the four rings code belongs to by the kind of rule it holds: domain, application, data or presentation. An inner layer never depends on an outer one.
_Avoid_: tier.

**Domain**:
The layer holding the business rules that would hold even without this software, and the ports the business itself names.
_Avoid_: core when meaning this layer.

**Application**:
The layer holding the product's own flows: its use cases and the technical ports they need.

**Data**:
The layer that implements the domain's and the application's ports against concrete sources.
_Avoid_: infrastructure layer, persistence layer.

**Presentation**:
The layer that exposes use cases to people or clients. Only apps have it.
_Avoid_: UI layer, frontend.

**Side**:
The runtime a piece of code is written for: server, client, or shared by both. Its nature decides it (the runtime it needs, the secrets it holds), not who uses it today.
_Avoid_: environment, target.

**Module**:
One business area of a product, such as portfolio or quotes: its module package plus, in each app that presents it, a part of the same name.
_Avoid_: feature.

**Core**:
What every module of a product shares while owning no business concept of its own: the product's kernel package, and each app's module-less part.
_Avoid_: shared, common, kernel.

**Composition root**:
The place in an app that wires the platform, the module packages and the app's own modules together; one per runtime the app runs in, such as the server and the browser.
_Avoid_: bootstrap.

**Use case**:
One flow of the product that an app triggers, orchestrating the domain through ports.
_Avoid_: interactor, service, application service.

**Port**:
An interface an inner layer declares and an outer layer implements. A business port speaks the domain's language and belongs to the domain; a technical port names a mechanism a flow needs, such as publishing events, and belongs to the application.

**Repository**:
The business port for storing and finding one kind of aggregate, and each implementation of it against a source.

**Read query**:
The business port for a read that combines several aggregates and returns a read model.
_Avoid_: finder, view repository.

**Datasource**:
One source of one domain concept, split out only for a repository that combines two or more sources.
_Avoid_: provider.

**Infra**:
Code that talks to one concrete medium, such as an HTTP API, a database, a cache or a file store, in that medium's own terms and knowing nothing of the business. Generic media belong to the platform package; a module keeps the infra only it needs.
_Avoid_: infrastructure layer, adapter, driver.

**DTO**:
The wire shape of the product's own HTTP contract, shared by its API and its clients. An external system's response shapes are not DTOs; they belong to that system's infra.
_Avoid_: contract, payload.

**Model**:
A domain object with an identity that lasts over time, whose state changes only under business rules.
_Avoid_: entity, which here suggests a class mapped to a database table; domain model when meaning everything the domain holds.

**Value object**:
A business value without identity: equal to another when its values are equal, and never changed once made.

**Read model**:
A shape built for one read that combines several aggregates, with no rules of its own.
_Avoid_: view, DTO.

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
