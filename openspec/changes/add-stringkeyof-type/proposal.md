# Add StringKeyof Utility Type

## Why

The @m0n0lab/ts-types package currently provides several utility types (Nullable, StrictOmit, etc.) but lacks a type-safe way to extract only string keys from objects. This is a common pattern when working with typed object keys where numeric and symbol keys need to be filtered out, particularly in scenarios involving type-safe object manipulation, configuration objects, and API parameter handling.

## What Changes

- Add new `StringKeyof<T>` utility type to @m0n0lab/ts-types package
- Export the new type from the main index
- Add comprehensive type tests using expectType
- Document the type with JSDoc comments and usage examples

## Impact

- **Affected specs**: type-utilities (new capability)
- **Affected code**:
  - `packages/ts-types/src/string-keyof.ts` (new file)
  - `packages/ts-types/src/string-keyof.test-d.ts` (new file)
  - `packages/ts-types/src/index.ts` (export addition)
- **Breaking changes**: None - this is a purely additive change
- **Migration**: No migration required - existing code is unaffected
