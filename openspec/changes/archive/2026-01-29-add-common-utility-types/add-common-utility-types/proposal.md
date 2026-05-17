# Add Common Utility Types

## Why

TypeScript projects frequently need nullable, undefinable, and strict type utilities for null-safe code and better type inference. Without standardized utility types, each package may define its own variations, leading to inconsistency and duplication across the monorepo.

The `@monolab/types` package currently lacks fundamental type utilities that are commonly needed across projects. This change adds a curated set of utility types and their corresponding type guards to provide a solid foundation for type-safe development.

## What Changes

- Add `Nullable<T>` type (T | null)
- Add `Undefinable<T>` type (T | undefined)
- Add `Nullish<T>` type (T | null | undefined)
- Add opposite types: `NonNullable<T>`, `NonUndefinable<T>`, `NonNullish<T>`
- Add type guards: `isNullable()`, `isUndefinable()`, `isNullish()` and their inverses
- Add `StrictOmit<T, K>` type that errors if key doesn't exist in T
- Add comprehensive type tests using TypeScript's type testing utilities
- Add documentation with usage examples for each utility type

## Impact

- **Affected specs**: `types-package` (new requirements for utility types)
- **Affected code**:
  - New files: `packages/types/src/nullable.ts`, `packages/types/src/strict-omit.ts`
  - Modified: `packages/types/src/index.ts` (exports)
  - New test files: `packages/types/src/*.test-d.ts` (type tests)
- **Dependencies**: This change depends on `add-types-package` being implemented first
- **Breaking changes**: None (new functionality only)
