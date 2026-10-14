# Design

## Context

See proposal.md for motivation. Both base classes currently supply an empty mount method and both framework hooks call it unconditionally. React awaits it; Solid forwards a captured Owner without awaiting. React's base-class test explicitly requires the inherited method to exist, while the other direct-call tests implement their own hooks. Eleven overrides exist, including six Qup ViewModels; no direct `super.didMount()` call was found in apps or packages.

The canonical spec inventory contains no ViewModel lifecycle capability. The active `qup` change defines Solid behavior and currently requires a mount call and base method, so its wording needs reconciliation during implementation.

## Goals / Non-Goals

**Goals:** Represent absent mount behavior in the public type and runtime contract while preserving framework scheduling and teardown.

**Non-Goals:** Lifecycle redesign, changes to async error handling, changes to cleanup, package version edits, or publication.

## Decisions

1. Use optional method declarations: React `didMount?(): Promise<void> | void;`; Solid `didMount?(owner?: Owner): Promise<void> | void;`. Retain subclass `override` modifiers. An abstract method would force every subclass to implement mount logic; retaining the no-op would keep the misleading contract.
2. Use `await instanceRef.current!.didMount?.()` in React and `vm.didMount?.(owner ?? undefined)` in Solid. Member calls preserve `this` and each framework's current scheduling. Do not extract the method or introduce a wrapper that could alter the receiver or async behavior.
3. Keep the two packages on one lifecycle capability, since the optionality contract is shared. During implementation, update the active Qup spec's base declaration, direct-call scenarios, and hook invocation wording together; qualify scenarios as applying when the hook is implemented. Add the absent-hook case. Leave unrelated Qup requirements intact.
4. Update React's base-method assertion to expect absence and add framework hook cases for a ViewModel without mount logic, verifying registered teardown still runs. Reuse existing Vitest/browser/Solid fixtures and existing tests for implemented hooks, Owner forwarding, async hooks, cleanup, and React reuse. Avoid changing tests that call concrete implementations.
5. Treat the public API removal as breaking, per the owner's decision. Use `feat!` or a `BREAKING CHANGE` footer for the eventual release-facing commit and explain both consumer migrations. No version bump or publish is part of implementation.

## Risks / Trade-offs

- Base-typed callers and direct subclass `super.didMount()` calls break → document optional invocation for callers and removal of empty super calls; mark the release breaking.
- Missing-hook mounts could bypass teardown accidentally → cover the complete mount/unmount path with registered teardown in both existing hook test suites.
- The active Qup spec could reintroduce a required mount contract later → reconcile all mount-related wording during implementation; this shared capability governs optionality.
- Public declarations could differ from source → run existing Nx typecheck, build, and `build:check-exports` targets, then inspect emitted declarations.
- Fresh-worktree cached dependencies can lack dist output → rebuild affected dependencies through Nx with `--skip-nx-cache` if encountered. Build already depends on typecheck; no project configuration changes are needed.

## Migration Plan

1. Apply source, test, JSDoc, and active-spec changes together; run Nx validation.
2. Record a breaking release note: use guarded calls such as `vm.didMount?.()` on base-typed values; remove direct `super.didMount()` calls because the base no longer implements the hook. Implementing subclasses retain `override`.
3. Let the existing release workflow determine package versions and publication. If rollback is needed before release, revert the implementation and its accompanying contract/test updates together; after release, consumers can pin the prior package version while a corrective release is prepared.
