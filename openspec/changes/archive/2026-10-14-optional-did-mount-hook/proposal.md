# Proposal

## Why

Mount initialization is optional for ViewModels, but react-clean and solid-clean currently inherit an empty mount method. Declaring the hook optional makes the public contract reflect that behavior and supports consumers that need no mount logic.

## What Changes

- **BREAKING**: Replace both base-class `didMount` bodies with optional method declarations, preserving their return types and Solid's optional Owner parameter.
- Invoke the hook conditionally in both `useViewModel` implementations; preserve React's await and Solid's owner forwarding.
- Trim React's mount JSDoc and describe conditional invocation accurately.
- Update the active `qup` Solid specification to describe optional mount behavior.
- Correct React's inherited-method assertion and cover mounting without a hook while retaining cleanup and implemented-hook coverage.
- Classify the eventual release-facing commit as breaking, as confirmed by the owner.

## Capabilities

### New Capabilities

- `view-model-lifecycle`: Optional mount hooks and conditional framework lifecycle integration for the existing React and Solid packages. No canonical lifecycle spec currently exists; the active `qup` change separately defines Solid behavior and must remain consistent.

### Modified Capabilities

None in `openspec/specs/`. Reconcile `openspec/changes/qup/specs/solid-clean/spec.md` during implementation.

## Impact

- Source: both packages' `src/base.viewmodel.ts` and `src/use-view-model.hook.ts`; React JSDoc; relevant lifecycle tests.
- Published API: `@m0n0lab/react-clean` (currently 3.4.1) and `@m0n0lab/solid-clean` (currently 0.2.2).
- Consumers calling a base-typed value must guard the hook, such as `vm.didMount?.()`. Direct subclasses calling `super.didMount()` must remove the call because the base supplies no implementation.
- Existing 11 overrides retain `override`. Cleanup behavior, package exports, runtime dependencies, and peer dependencies stay unchanged.
- Validate through existing Nx test, typecheck, build, and `build:check-exports` targets; the last runs `attw --pack`.
