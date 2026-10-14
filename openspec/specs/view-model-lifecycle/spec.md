# view-model-lifecycle Specification

## Purpose

Define the public mount and cleanup lifecycle contract shared by the existing react-clean and solid-clean ViewModel packages.

## Requirements

### Requirement: Optional mount contract

The existing `@m0n0lab/react-clean` and `@m0n0lab/solid-clean` packages SHALL expose `BaseViewModel.didMount` as an optional method with return type `Promise<void> | void`, without a default implementation. Solid's method SHALL accept an optional `Owner` parameter. Subclasses SHALL remain able to implement it with `override`.

#### Scenario: ViewModel omits mount initialization
- **WHEN** a concrete subclass implements no mount hook
- **THEN** it is valid to instantiate the subclass and its inherited `didMount` value is undefined

#### Scenario: Subclass implements mount initialization
- **WHEN** a subclass declares `override didMount` returning void or Promise<void>
- **THEN** it satisfies the base contract and supports direct calls through the concrete subclass type

#### Scenario: Caller uses the base type
- **WHEN** a consumer accesses `didMount` through a BaseViewModel-typed value
- **THEN** its type includes undefined and callers must account for absence before invocation

### Requirement: Conditional mount integration

Each package's existing `useViewModel` hook SHALL invoke an implemented mount hook with the ViewModel as its receiver, and SHALL skip invocation when absent. React SHALL retain awaited invocation. Solid SHALL forward the captured owner, using undefined when no owner exists, and SHALL retain its existing non-awaited invocation.

#### Scenario: Mount without a hook
- **WHEN** either framework mounts a ViewModel without `didMount`
- **THEN** the mount callback completes without an error caused by the absent hook

#### Scenario: React mounts an implementing ViewModel
- **WHEN** a React ViewModel implementing asynchronous `didMount` mounts
- **THEN** the existing mount callback invokes it once with the correct receiver and awaits its result

#### Scenario: Solid mounts an implementing ViewModel
- **WHEN** a Solid ViewModel implementing `didMount` mounts
- **THEN** it receives the owner captured during hook initialization, or undefined if absent, with the correct receiver

### Requirement: Cleanup independence

Both hooks SHALL retain their existing instance creation and reuse semantics and invoke `willUnmount` during framework cleanup, whether or not the ViewModel implements a mount hook. Existing subscription and cleanup registration patterns SHALL continue to work.

#### Scenario: Cleanup without mount initialization
- **WHEN** a ViewModel without `didMount` registers a subscription or cleanup and its component unmounts
- **THEN** the existing cleanup mechanism executes the registered teardown

#### Scenario: React rerender
- **WHEN** the React component rerenders
- **THEN** its hook retains the same ViewModel instance and does not repeat mount initialization

### Requirement: Dependency and export compatibility

This modification to existing packages SHALL preserve export names and paths, runtime dependencies, and peer dependencies. The public declarations SHALL expose the optional hook contract to package consumers.

#### Scenario: Built package contract
- **WHEN** both packages are built and their exports validated
- **THEN** ESM exports resolve successfully and exported base-class declarations describe an optional mount method

#### Scenario: Dependency manifests
- **WHEN** the change is applied
- **THEN** no runtime or peer dependency additions or version changes are required
