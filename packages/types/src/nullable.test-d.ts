import { describe, expectTypeOf, it } from "vitest";
import type { NonNullable, Nullable } from "./nullable.js";
import { isNonNullable, isNullable } from "./nullable.js";

describe("Nullable type", () => {
    it("should allow T or null", () => {
        expectTypeOf<Nullable<string>>().toEqualTypeOf<string | null>();
        expectTypeOf<Nullable<number>>().toEqualTypeOf<number | null>();
        expectTypeOf<Nullable<boolean>>().toEqualTypeOf<boolean | null>();
    });

    it("should work with complex types", () => {
        type User = { id: string; name: string };
        expectTypeOf<Nullable<User>>().toEqualTypeOf<User | null>();
    });
});

describe("NonNullable type", () => {
    it("should exclude null from union types", () => {
        expectTypeOf<NonNullable<string | null>>().toEqualTypeOf<string>();
        expectTypeOf<NonNullable<number | null>>().toEqualTypeOf<number>();
    });

    it("should preserve non-null types unchanged", () => {
        expectTypeOf<NonNullable<string>>().toEqualTypeOf<string>();
        expectTypeOf<NonNullable<number>>().toEqualTypeOf<number>();
    });

    it("should work with union types", () => {
        expectTypeOf<NonNullable<string | number | null>>().toEqualTypeOf<
            string | number
        >();
    });
});

describe("isNullable type guard", () => {
    it("should narrow type to null when true", () => {
        const value: string | null = null;
        if (isNullable(value)) {
            expectTypeOf(value).toEqualTypeOf<null>();
        }
    });

    it("should narrow type to non-null when false", () => {
        const value: string | null = "hello";
        if (!isNullable(value)) {
            expectTypeOf(value).toEqualTypeOf<string>();
        }
    });
});

describe("isNonNullable type guard", () => {
    it("should narrow type to non-null when true", () => {
        const value: string | null = "hello";
        if (isNonNullable(value)) {
            expectTypeOf(value).toEqualTypeOf<string>();
        }
    });

    it("should work with filter to remove nulls", () => {
        const values: (string | null)[] = ["hello", null, "world"];
        const filtered = values.filter(isNonNullable);
        expectTypeOf(filtered).toEqualTypeOf<string[]>();
    });
});
