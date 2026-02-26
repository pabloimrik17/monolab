# Type Utilities Specification

## Requirements

### Requirement: StringKeyOf Type Utility
The system SHALL provide a `StringKeyOf<T>` utility type that extracts only string keys from an object type T, filtering out numeric keys and symbol keys.

#### Scenario: Extract string keys from mixed-key interface
- **GIVEN** an interface with string, numeric, and symbol keys
- **WHEN** StringKeyOf<T> is applied to the interface
- **THEN** only string property names are returned as a union type

#### Scenario: Handle interface with only string keys
- **GIVEN** an interface with only string property names
- **WHEN** StringKeyOf<T> is applied
- **THEN** all property names are returned in the union type

#### Scenario: Filter numeric keys
- **GIVEN** an interface with numeric index signatures or numeric property names
- **WHEN** StringKeyOf<T> is applied
- **THEN** numeric keys are excluded from the result type

#### Scenario: Filter symbol keys
- **GIVEN** an interface with symbol property keys
- **WHEN** StringKeyOf<T> is applied
- **THEN** symbol keys are excluded from the result type

#### Scenario: Empty object type
- **GIVEN** an empty object type or interface
- **WHEN** StringKeyOf<T> is applied
- **THEN** the result is the never type

### Requirement: Type Export
The StringKeyOf type SHALL be exported from the package's main entry point for consumer usage.

#### Scenario: Import from package
- **GIVEN** the @m0n0lab/ts-types package is installed
- **WHEN** importing { StringKeyOf } from "@m0n0lab/ts-types"
- **THEN** the type is available for use in consuming code

### Requirement: Type Documentation
The StringKeyOf type SHALL include comprehensive JSDoc documentation explaining its purpose, usage, and behavior.

#### Scenario: View type documentation
- **GIVEN** a developer using an IDE with TypeScript support
- **WHEN** hovering over the StringKeyOf type
- **THEN** JSDoc documentation is displayed showing description and examples

### Requirement: Type Testing
The StringKeyOf type SHALL have comprehensive type-level tests using expectType to verify correct behavior.

#### Scenario: Type tests pass
- **GIVEN** the type test file is executed
- **WHEN** running type checking
- **THEN** all expectType assertions pass without type errors
