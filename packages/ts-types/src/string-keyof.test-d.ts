import { describe, expectTypeOf, it } from "vitest";
import type { StringKeyOf } from "./string-keyof.ts";

describe("StringKeyOf type", () => {
    it("should extract all keys from simple string-only interfaces", () => {
        interface User {
            id: string;
            name: string;
            email: string;
        }

        type UserKeys = StringKeyOf<User>;
        expectTypeOf<UserKeys>().toEqualTypeOf<"id" | "name" | "email">();
    });

    it("should filter out numeric keys", () => {
        interface MixedNumeric {
            name: string;
            42: number;
            100: boolean;
        }

        type OnlyStringKeys = StringKeyOf<MixedNumeric>;
        expectTypeOf<OnlyStringKeys>().toEqualTypeOf<"name">();
    });

    it("should filter out symbol keys", () => {
        const sym1 = Symbol("test");
        const sym2 = Symbol("another");

        interface MixedSymbol {
            name: string;
            age: number;
            [sym1]: string;
            [sym2]: number;
        }

        type OnlyStringKeys = StringKeyOf<MixedSymbol>;
        expectTypeOf<OnlyStringKeys>().toEqualTypeOf<"name" | "age">();
    });

    it("should filter out both numeric and symbol keys", () => {
        const sym = Symbol("iterator");

        interface ComplexMixed {
            stringKey1: string;
            stringKey2: number;
            42: string;
            100: number;
            [sym]: () => void;
        }

        type OnlyStringKeys = StringKeyOf<ComplexMixed>;
        expectTypeOf<OnlyStringKeys>().toEqualTypeOf<
            "stringKey1" | "stringKey2"
        >();
    });

    it("should return never for objects with no string keys", () => {
        interface OnlyNumericKeys {
            0: string;
            1: number;
            2: boolean;
        }

        type NoStringKeys = StringKeyOf<OnlyNumericKeys>;
        expectTypeOf<NoStringKeys>().toEqualTypeOf<never>();
    });

    it("should work with empty objects", () => {
        type Empty = {};

        type EmptyKeys = StringKeyOf<Empty>;
        expectTypeOf<EmptyKeys>().toEqualTypeOf<never>();
    });

    it("should work with Record types", () => {
        type StringRecord = Record<string, number>;

        type RecordKeys = StringKeyOf<StringRecord>;
        expectTypeOf<RecordKeys>().toEqualTypeOf<string>();
    });

    it("should preserve literal string types", () => {
        interface Config {
            host: "localhost" | "production";
            port: 3000 | 8080;
            mode: "dev" | "prod";
        }

        type ConfigKeys = StringKeyOf<Config>;
        expectTypeOf<ConfigKeys>().toEqualTypeOf<"host" | "port" | "mode">();
    });

    it("should work with nested object types", () => {
        interface Nested {
            user: {
                name: string;
                age: number;
            };
            settings: {
                theme: string;
            };
        }

        type NestedKeys = StringKeyOf<Nested>;
        expectTypeOf<NestedKeys>().toEqualTypeOf<"user" | "settings">();
    });

    it("should work with optional properties", () => {
        interface OptionalProps {
            required: string;
            optional?: number;
            anotherOptional?: boolean;
        }

        type AllKeys = StringKeyOf<OptionalProps>;
        expectTypeOf<AllKeys>().toEqualTypeOf<
            "required" | "optional" | "anotherOptional"
        >();
    });
});
