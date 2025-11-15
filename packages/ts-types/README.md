# @m0n0lab/ts-types

[![npm version](https://img.shields.io/npm/v/@m0n0lab/ts-types.svg)](https://www.npmjs.com/package/@m0n0lab/ts-types)
[![ts-types coverage](https://codecov.io/gh/pabloimrik17/monolab/badge.svg?flag=ts-types)](https://codecov.io/gh/pabloimrik17/monolab?flag=ts-types)
[![ts-types bundle](https://codecov.io/gh/pabloimrik17/monolab/graph/bundle/ts-types/badge.svg)](https://codecov.io/gh/pabloimrik17/monolab/bundle/ts-types)

A centralized package for sharing custom TypeScript type definitions, utilities, and type guards across all Monolab projects.

## Features

-   🎯 Centralized type definitions
-   ✅ Fully typed with TypeScript
-   📦 Zero runtime dependencies
-   ⚡ Lightweight and tree-shakeable
-   🔒 Type-safe and reliable
-   📚 Comprehensive documentation
-   🚀 Production ready library
-   📘 Well documented

## Installation

### npm

```bash
npm install @m0n0lab/ts-types
```

### pnpm

```bash
pnpm add @m0n0lab/ts-types
```

### JSR

```bash
npx jsr add @m0n0lab/ts-types
```

## Usage

### Nullable Types

Handle nullable values with type-safe utilities:

```typescript
import type { Nullable, NonNullable } from "@m0n0lab/ts-types";
import { isNullable, isNonNullable } from "@m0n0lab/ts-types";

// Type definitions
type NullableString = Nullable<string>; // string | null
type RequiredString = NonNullable<string | null>; // string

// Type guards
const value: string | null = getValue();
if (isNonNullable(value)) {
    console.log(value.toUpperCase()); // TypeScript knows value is string
}

// Filter arrays
const items: (string | null)[] = ["hello", null, "world"];
const validItems = items.filter(isNonNullable); // string[]
```

### Undefinable Types

Work with optional values safely:

```typescript
import type { Undefinable, NonUndefinable } from "@m0n0lab/ts-types";
import { isUndefinable, isNonUndefinable } from "@m0n0lab/ts-types";

// Type definitions
type OptionalString = Undefinable<string>; // string | undefined
type RequiredString = NonUndefinable<string | undefined>; // string

// Type guards
const value: string | undefined = findValue();
if (isNonUndefinable(value)) {
    console.log(value.length); // TypeScript knows value is defined
}
```

### Nullish Types

Handle both null and undefined:

```typescript
import type { Nullish, NonNullish } from "@m0n0lab/ts-types";
import { isNullish, isNonNullish } from "@m0n0lab/ts-types";

// Type definitions
type MaybeString = Nullish<string>; // string | null | undefined
type DefiniteString = NonNullish<string | null | undefined>; // string

// Type guards
const value: string | null | undefined = getOptionalValue();
if (isNonNullish(value)) {
    console.log(value.trim()); // TypeScript knows value is string
}

// Filter arrays
const items: (string | null | undefined)[] = [
    "hello",
    null,
    undefined,
    "world",
];
const validItems = items.filter(isNonNullish); // string[]
```

### StrictOmit

Omit object properties with compile-time safety:

```typescript
import type { StrictOmit } from "@m0n0lab/ts-types";

interface User {
    id: string;
    name: string;
    email: string;
}

// Valid: 'email' exists in User
type PublicUser = StrictOmit<User, "email">; // { id: string; name: string }

// Error: 'age' doesn't exist in User
// type Invalid = StrictOmit<User, 'age'>; // TypeScript error!

// Unlike built-in Omit which allows non-existent keys:
type Unsafe = Omit<User, "age">; // No error, less safe
```

### StringKeyOf

Extract only string keys from object types, filtering out numeric and symbol keys:

```typescript
import type { StringKeyOf } from "@m0n0lab/ts-types";

interface MixedKeys {
    name: string; // string key
    age: number; // string key
    42: string; // numeric key
    [Symbol.iterator]: () => void; // symbol key
}

// Only extracts string keys
type OnlyStringKeys = StringKeyOf<MixedKeys>; // "name" | "age"

// Useful for type-safe object key operations
interface Config {
    host: string;
    port: number;
    debug: boolean;
}

type ConfigKey = StringKeyOf<Config>; // "host" | "port" | "debug"

// Works with Record types
type StringRecord = Record<string, number>;
type RecordKeys = StringKeyOf<StringRecord>; // string

// Returns never for objects with no string keys
interface OnlyNumeric {
    0: string;
    1: number;
}
type NoKeys = StringKeyOf<OnlyNumeric>; // never
```

## Contributing

Contributions are welcome! Please read our [contributing guidelines](../../CONTRIBUTING.md) before submitting a pull request.

## License

MIT
