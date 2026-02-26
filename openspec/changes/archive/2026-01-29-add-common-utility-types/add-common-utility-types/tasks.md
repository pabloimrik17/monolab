# Implementation Tasks

## 1. Nullable Type Utilities

- [x] 1.1 Create `src/nullable.ts` file
- [x] 1.2 Define `Nullable<T>` type (T | null)
- [x] 1.3 Define `NonNullable<T>` type (Exclude<T, null>)
- [x] 1.4 Implement `isNullable<T>()` type guard
- [x] 1.5 Implement `isNonNullable<T>()` type guard
- [x] 1.6 Add JSDoc documentation with examples

## 2. Undefinable Type Utilities

- [x] 2.1 Create `src/undefinable.ts` file
- [x] 2.2 Define `Undefinable<T>` type (T | undefined)
- [x] 2.3 Define `NonUndefinable<T>` type (Exclude<T, undefined>)
- [x] 2.4 Implement `isUndefinable<T>()` type guard
- [x] 2.5 Implement `isNonUndefinable<T>()` type guard
- [x] 2.6 Add JSDoc documentation with examples

## 3. Nullish Type Utilities

- [x] 3.1 Create `src/nullish.ts` file
- [x] 3.2 Define `Nullish<T>` type (T | null | undefined)
- [x] 3.3 Define `NonNullish<T>` type (Exclude<T, null | undefined>)
- [x] 3.4 Implement `isNullish<T>()` type guard
- [x] 3.5 Implement `isNonNullish<T>()` type guard
- [x] 3.6 Add JSDoc documentation with examples

## 4. StrictOmit Utility

- [x] 4.1 Create `src/strict-omit.ts` file
- [x] 4.2 Define `StrictOmit<T, K extends keyof T>` type
- [x] 4.3 Add JSDoc documentation with examples
- [x] 4.4 Document difference from built-in `Omit<T, K>`

## 5. Type Tests

- [x] 5.1 Create `src/nullable.test-d.ts` with type tests
- [x] 5.2 Create `src/undefinable.test-d.ts` with type tests
- [x] 5.3 Create `src/nullish.test-d.ts` with type tests
- [x] 5.4 Create `src/strict-omit.test-d.ts` with type tests
- [x] 5.5 Verify all type tests pass with `tsc --noEmit`

## 6. Exports and Integration

- [x] 6.1 Update `src/index.ts` to export nullable utilities
- [x] 6.2 Update `src/index.ts` to export undefinable utilities
- [x] 6.3 Update `src/index.ts` to export nullish utilities
- [x] 6.4 Update `src/index.ts` to export StrictOmit
- [x] 6.5 Verify tree-shaking works correctly

## 7. Documentation

- [x] 7.1 Update README with Nullable types section
- [x] 7.2 Update README with Undefinable types section
- [x] 7.3 Update README with Nullish types section
- [x] 7.4 Update README with StrictOmit section
- [x] 7.5 Add usage examples for each utility type
- [x] 7.6 Update CHANGELOG.md with new utilities

## 8. Validation

- [x] 8.1 Run `pnpm run build` and verify successful compilation
- [x] 8.2 Run `pnpm run typecheck` and verify no errors
- [x] 8.3 Run type tests and verify all pass
- [x] 8.4 Verify exports are correctly typed in consumer code
- [x] 8.5 Run `pnpm run lint` and fix any issues
