## ADDED Requirements

### Requirement: BaseViewModel abstract class

The system SHALL provide an abstract `BaseViewModel` class in `packages/solid-clean` with:
- A private `cleanups` array of `(() => void)` functions
- `addCleanup(...fns: (() => void)[]): void` — adds cleanup functions to the list
- `didMount(owner?: Owner): Promise<void> | void` — lifecycle hook called on component mount, receives optional Solid Owner for reactive scope access
- `willUnmount(): void` — executes all cleanup functions and resets the array

`BaseViewModel` SHALL NOT depend on inversify, rxjs, or any DI framework. It SHALL NOT use `@injectable()` — concrete ViewModels in consuming apps add that decorator themselves.

#### Scenario: Add and execute cleanups
- **WHEN** `addCleanup(fn1, fn2)` is called and then `willUnmount()` is called
- **THEN** both fn1 and fn2 are executed

#### Scenario: Cleanups reset after willUnmount
- **WHEN** `willUnmount()` is called, then new cleanups are added, then `willUnmount()` is called again
- **THEN** only the newly added cleanups are executed on the second call

#### Scenario: didMount receives owner
- **WHEN** `didMount(owner)` is called with a Solid Owner
- **THEN** the ViewModel can use `runWithOwner(owner, ...)` to create effects within the component's reactive scope

#### Scenario: didMount without owner
- **WHEN** `didMount()` is called without an owner
- **THEN** it executes normally (owner is optional)

### Requirement: useViewModel hook

The system SHALL provide a `useViewModel<T extends BaseViewModel>(factory: () => T): T` function that:
1. Calls the factory function once to create the ViewModel instance (no ref needed — Solid components execute once)
2. Captures the current Solid owner via `getOwner()`
3. Calls `vm.didMount(owner)` inside `onMount()`
4. Registers `vm.willUnmount()` via `onCleanup()`
5. Returns the ViewModel instance

#### Scenario: ViewModel created once
- **WHEN** `useViewModel(() => new MyVM())` is called
- **THEN** the factory is invoked exactly once and the VM instance is returned

#### Scenario: Lifecycle wired to Solid
- **WHEN** the component mounts
- **THEN** `didMount` is called with the component's owner

#### Scenario: Cleanup on unmount
- **WHEN** the component is unmounted
- **THEN** `willUnmount()` is called, executing all registered cleanups

### Requirement: Package structure and exports

The package SHALL be named `@m0n0lab/solid-clean` and SHALL export exactly two items: `BaseViewModel` and `useViewModel`. Peer dependency SHALL be `solid-js` only. The package SHALL have zero runtime dependencies. It SHALL follow the same build conventions as `@m0n0lab/react-clean`: tsdown build, Vitest tests, ESM-only, exports validated with `attw --pack`.

#### Scenario: Package exports
- **WHEN** `@m0n0lab/solid-clean` is imported
- **THEN** `BaseViewModel` and `useViewModel` are available as named exports

#### Scenario: No inversify dependency
- **WHEN** the package's dependencies and peerDependencies are inspected
- **THEN** inversify is NOT listed (consuming apps bring their own DI)

#### Scenario: Build output validation
- **WHEN** `attw --pack` is run against the built package
- **THEN** exports resolve correctly for ESM consumers

### Requirement: Test coverage

The system SHALL include unit tests for `BaseViewModel` (lifecycle, cleanup management) and `useViewModel` (Solid lifecycle integration). Tests SHALL follow the same patterns as `@m0n0lab/react-clean` tests: factory mocks, lifecycle verification, re-render safety (though Solid components run once, ensuring no double-execution).

#### Scenario: BaseViewModel unit tests
- **WHEN** the test suite runs
- **THEN** BaseViewModel cleanup add/execute/reset behavior is verified

#### Scenario: useViewModel integration tests
- **WHEN** the test suite runs with a Solid testing environment
- **THEN** onMount→didMount and onCleanup→willUnmount wiring is verified
