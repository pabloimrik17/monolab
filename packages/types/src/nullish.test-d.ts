import { describe, expectTypeOf, it } from "vitest";
import type { NonNullish, Nullish } from "./nullish.js";
import { isNonNullish, isNullish } from "./nullish.js";

describe("Nullish type", () => {
    it("should allow T, null, or undefined", () => {
        expectTypeOf<Nullish<string>>().toEqualTypeOf<
            string | null | undefined
        >();
        expectTypeOf<Nullish<number>>().toEqualTypeOf<
            number | null | undefined
        >();
        expectTypeOf<Nullish<boolean>>().toEqualTypeOf<
            boolean | null | undefined
        >();
    });

    it("should work with complex types", () => {
        type User = { id: string; name: string };
        expectTypeOf<Nullish<User>>().toEqualTypeOf<User | null | undefined>();
    });
});

describe("NonNullish type", () => {
    it("should exclude both null and undefined from union types", () => {
        expectTypeOf<
            NonNullish<string | null | undefined>
        >().toEqualTypeOf<string>();
        expectTypeOf<
            NonNullish<number | null | undefined>
        >().toEqualTypeOf<number>();
    });

    it("should preserve non-nullish types unchanged", () => {
        expectTypeOf<NonNullish<string>>().toEqualTypeOf<string>();
        expectTypeOf<NonNullish<number>>().toEqualTypeOf<number>();
    });

    it("should work with union types", () => {
        expectTypeOf<
            NonNullish<string | number | null | undefined>
        >().toEqualTypeOf<string | number>();
    });

    it("should exclude only null when undefined is not present", () => {
        expectTypeOf<NonNullish<string | null>>().toEqualTypeOf<string>();
    });

    it("should exclude only undefined when null is not present", () => {
        expectTypeOf<NonNullish<string | undefined>>().toEqualTypeOf<string>();
    });
});

describe("isNullish type guard", () => {
    it("should narrow type to null | undefined when true", () => {
        const getValue = (): string | null | undefined => null;
        const value = getValue();
        if (isNullish(value)) {
            expectTypeOf(value).toEqualTypeOf<null | undefined>();
        }
    });

    it("should narrow type to non-nullish when false", () => {
        const getValue = (): string | null | undefined => "hello";
        const value = getValue();
        if (!isNullish(value)) {
            expectTypeOf(value).toEqualTypeOf<string>();
        }
    });
});

describe("isNonNullish type guard", () => {
    it("should narrow type to non-nullish when true", () => {
        const value: string | null | undefined = "hello";
        if (isNonNullish(value)) {
            expectTypeOf(value).toEqualTypeOf<string>();
        }
    });

    it("should work with filter to remove nullish values", () => {
        const values: (string | null | undefined)[] = [
            "hello",
            null,
            undefined,
            "world",
        ];
        const filtered = values.filter(isNonNullish);
        expectTypeOf(filtered).toEqualTypeOf<string[]>();
    });
});
