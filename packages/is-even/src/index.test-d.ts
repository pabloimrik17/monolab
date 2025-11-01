import { expectTypeOf } from "vitest";
import { isEven, isNotEven } from "./index.js";

// Test isEven function signature
expectTypeOf(isEven).toBeFunction();
expectTypeOf(isEven).parameter(0).toBeNumber();
expectTypeOf(isEven).returns.toBeBoolean();

// Test isNotEven function signature
expectTypeOf(isNotEven).toBeFunction();
expectTypeOf(isNotEven).parameter(0).toBeNumber();
expectTypeOf(isNotEven).returns.toBeBoolean();

// Test that invalid types are rejected for isEven
// @ts-expect-error - should not accept string
isEven("4");

// @ts-expect-error - should not accept undefined
isEven(undefined);

// Test that invalid types are rejected for isNotEven
// @ts-expect-error - should not accept string
isNotEven("5");

// Test valid calls compile
expectTypeOf(isEven(4)).toBeBoolean();
expectTypeOf(isEven(0)).toBeBoolean();
expectTypeOf(isNotEven(3)).toBeBoolean();
