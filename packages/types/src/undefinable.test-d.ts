import { describe, expectTypeOf, it } from "vitest";
import type { NonUndefinable, Undefinable } from "./undefinable.js";
import { isNonUndefinable, isUndefinable } from "./undefinable.js";

describe("Undefinable type", () => {
    it("should allow T or undefined", () => {
        expectTypeOf<Undefinable<string>>().toEqualTypeOf<string | undefined>();
        expectTypeOf<Undefinable<number>>().toEqualTypeOf<number | undefined>();
        expectTypeOf<Undefinable<boolean>>().toEqualTypeOf<
            boolean | undefined
        >();
    });

    it("should work with complex types", () => {
        type User = { id: string; name: string };
        expectTypeOf<Undefinable<User>>().toEqualTypeOf<User | undefined>();
    });
});

describe("NonUndefinable type", () => {
    it("should exclude undefined from union types", () => {
        expectTypeOf<
            NonUndefinable<string | undefined>
        >().toEqualTypeOf<string>();
        expectTypeOf<
            NonUndefinable<number | undefined>
        >().toEqualTypeOf<number>();
    });

    it("should preserve non-undefined types unchanged", () => {
        expectTypeOf<NonUndefinable<string>>().toEqualTypeOf<string>();
        expectTypeOf<NonUndefinable<number>>().toEqualTypeOf<number>();
    });

    it("should work with union types", () => {
        expectTypeOf<
            NonUndefinable<string | number | undefined>
        >().toEqualTypeOf<string | number>();
    });
});

describe("isUndefinable type guard", () => {
    it("should narrow type to undefined when true", () => {
        const value: string | undefined = undefined;
        if (isUndefinable(value)) {
            expectTypeOf(value).toEqualTypeOf<undefined>();
        }
    });

    it("should narrow type to non-undefined when false", () => {
        const value: string | undefined = "hello";
        if (!isUndefinable(value)) {
            expectTypeOf(value).toEqualTypeOf<string>();
        }
    });
});

describe("isNonUndefinable type guard", () => {
    it("should narrow type to non-undefined when true", () => {
        const value: string | undefined = "hello";
        if (isNonUndefinable(value)) {
            expectTypeOf(value).toEqualTypeOf<string>();
        }
    });

    it("should work with filter to remove undefined values", () => {
        const values: (string | undefined)[] = ["hello", undefined, "world"];
        const filtered = values.filter(isNonUndefinable);
        expectTypeOf(filtered).toEqualTypeOf<string[]>();
    });
});
