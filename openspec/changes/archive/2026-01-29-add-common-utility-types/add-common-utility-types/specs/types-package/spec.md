# Types Package Specification - Utility Types Delta

## ADDED Requirements

### Requirement: Nullable Type Utilities

The package SHALL provide nullable type utilities for handling values that can be null.

#### Scenario: Nullable type definition

- **WHEN** importing `Nullable<T>` from the package
- **THEN** the type SHALL be equivalent to `T | null`
- **AND** it SHALL accept any type parameter T

#### Scenario: NonNullable type definition

- **WHEN** importing `NonNullable<T>` from the package
- **THEN** the type SHALL exclude null from type T
- **AND** it SHALL be equivalent to `Exclude<T, null>`

#### Scenario: Type guard for nullable values

- **WHEN** using `isNullable(value)` type guard
- **THEN** it SHALL return true if value is null
- **AND** TypeScript SHALL narrow the type to include null in the true branch
- **AND** it SHALL return false for non-null values

#### Scenario: Type guard for non-nullable values

- **WHEN** using `isNonNullable(value)` type guard
- **THEN** it SHALL return true if value is not null
- **AND** TypeScript SHALL narrow the type to exclude null in the true branch
- **AND** it SHALL return false for null values

### Requirement: Undefinable Type Utilities

The package SHALL provide undefinable type utilities for handling values that can be undefined.

#### Scenario: Undefinable type definition

- **WHEN** importing `Undefinable<T>` from the package
- **THEN** the type SHALL be equivalent to `T | undefined`
- **AND** it SHALL accept any type parameter T

#### Scenario: NonUndefinable type definition

- **WHEN** importing `NonUndefinable<T>` from the package
- **THEN** the type SHALL exclude undefined from type T
- **AND** it SHALL be equivalent to `Exclude<T, undefined>`

#### Scenario: Type guard for undefinable values

- **WHEN** using `isUndefinable(value)` type guard
- **THEN** it SHALL return true if value is undefined
- **AND** TypeScript SHALL narrow the type to include undefined in the true branch
- **AND** it SHALL return false for defined values

#### Scenario: Type guard for non-undefinable values

- **WHEN** using `isNonUndefinable(value)` type guard
- **THEN** it SHALL return true if value is not undefined
- **AND** TypeScript SHALL narrow the type to exclude undefined in the true branch
- **AND** it SHALL return false for undefined values

### Requirement: Nullish Type Utilities

The package SHALL provide nullish type utilities for handling values that can be null or undefined.

#### Scenario: Nullish type definition

- **WHEN** importing `Nullish<T>` from the package
- **THEN** the type SHALL be equivalent to `T | null | undefined`
- **AND** it SHALL accept any type parameter T

#### Scenario: NonNullish type definition

- **WHEN** importing `NonNullish<T>` from the package
- **THEN** the type SHALL exclude both null and undefined from type T
- **AND** it SHALL be equivalent to `Exclude<T, null | undefined>`

#### Scenario: Type guard for nullish values

- **WHEN** using `isNullish(value)` type guard
- **THEN** it SHALL return true if value is null or undefined
- **AND** TypeScript SHALL narrow the type to include null | undefined in the true branch
- **AND** it SHALL return false for defined, non-null values

#### Scenario: Type guard for non-nullish values

- **WHEN** using `isNonNullish(value)` type guard
- **THEN** it SHALL return true if value is neither null nor undefined
- **AND** TypeScript SHALL narrow the type to exclude null | undefined in the true branch
- **AND** it SHALL return false for null or undefined values

### Requirement: StrictOmit Utility Type

The package SHALL provide a type-safe omit utility that enforces key existence at compile time.

#### Scenario: StrictOmit type definition

- **WHEN** using `StrictOmit<T, K>` with valid keys
- **THEN** it SHALL omit properties K from type T
- **AND** K MUST extend keyof T (compile-time error if key doesn't exist)
- **AND** the result SHALL be equivalent to `Omit<T, K>` but with stricter key validation

#### Scenario: StrictOmit compile-time safety

- **WHEN** using `StrictOmit<T, K>` with invalid keys
- **THEN** TypeScript SHALL produce a compile-time error
- **AND** the error SHALL indicate the key does not exist in type T

#### Scenario: Comparison with built-in Omit

- **WHEN** documentation explains StrictOmit
- **THEN** it SHALL clarify the difference from TypeScript's built-in `Omit<T, K>`
- **AND** it SHALL explain that built-in Omit accepts any string key without validation
- **AND** it SHALL provide examples showing the stricter type safety

### Requirement: Type Testing

The package SHALL include comprehensive type tests for all utility types.

#### Scenario: Type test coverage

- **WHEN** running type tests
- **THEN** each utility type SHALL have corresponding `.test-d.ts` file
- **AND** tests SHALL verify correct type inference
- **AND** tests SHALL verify type guard narrowing behavior
- **AND** tests SHALL verify compile-time error cases for StrictOmit

#### Scenario: Type test execution

- **WHEN** validating types during development
- **THEN** running `tsc --noEmit` SHALL execute all type tests
- **AND** type tests SHALL fail compilation if types behave incorrectly
- **AND** the build system SHALL include type test validation

### Requirement: Utility Types Documentation

The package SHALL provide comprehensive documentation for all utility types with practical examples.

#### Scenario: API documentation

- **WHEN** a developer reads the utility type source files
- **THEN** each type and function SHALL have JSDoc comments
- **AND** JSDoc SHALL include `@example` tags with usage examples
- **AND** JSDoc SHALL describe the purpose and behavior

#### Scenario: README examples

- **WHEN** a developer reads the package README
- **THEN** it SHALL include a dedicated section for each utility type category
- **AND** each section SHALL show import statements
- **AND** each section SHALL provide practical code examples
- **AND** examples SHALL demonstrate both types and type guards where applicable
