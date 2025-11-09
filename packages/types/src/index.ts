/**
 * @monolab/types - Shared TypeScript type definitions for MonoLab packages
 * @packageDocumentation
 */

// Nullable utilities
export { isNonNullable, isNullable } from "./nullable.js";
export type { NonNullable, Nullable } from "./nullable.js";

// Undefinable utilities
export { isNonUndefinable, isUndefinable } from "./undefinable.js";
export type { NonUndefinable, Undefinable } from "./undefinable.js";

// Nullish utilities
export { isNonNullish, isNullish } from "./nullish.js";
export type { NonNullish, Nullish } from "./nullish.js";

// Strict type utilities
export type { StrictOmit } from "./strict-omit.js";
