/**
 * @monolab/ts-types - Shared TypeScript type definitions for MonoLab packages
 * @packageDocumentation
 */

// Nullable utilities
export { isNonNullable, isNullable } from "./nullable.ts";
export type { NonNullable, Nullable } from "./nullable.ts";

// Undefinable utilities
export { isNonUndefinable, isUndefinable } from "./undefinable.ts";
export type { NonUndefinable, Undefinable } from "./undefinable.ts";

// Nullish utilities
export { isNonNullish, isNullish } from "./nullish.ts";
export type { NonNullish, Nullish } from "./nullish.ts";

// Strict type utilities
export type { StrictOmit } from "./strict-omit.ts";

// String key utilities
export type { StringKeyOf } from "./string-keyof.ts";
