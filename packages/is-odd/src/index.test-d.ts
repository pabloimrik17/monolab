import { expectTypeOf } from "vitest";
import { isOdd } from "./index.js";

// Test function signature
expectTypeOf(isOdd).toBeFunction();
expectTypeOf(isOdd).parameter(0).toBeNumber();
expectTypeOf(isOdd).returns.toBeBoolean();

// Test that invalid types are rejected
// @ts-expect-error - should not accept string
isOdd("5");

// @ts-expect-error - should not accept undefined
isOdd(undefined);

// @ts-expect-error - should not accept null
isOdd(null);

// Test valid calls compile
expectTypeOf(isOdd(5)).toBeBoolean();
expectTypeOf(isOdd(0)).toBeBoolean();
expectTypeOf(isOdd(-3)).toBeBoolean();
