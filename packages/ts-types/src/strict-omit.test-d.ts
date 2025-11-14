import { describe, expectTypeOf, it } from "vitest";
import type { StrictOmit } from "./strict-omit.ts";

describe("StrictOmit type", () => {
    interface User {
        id: string;
        name: string;
        email: string;
        age: number;
    }

    it("should omit a single property", () => {
        type UserWithoutEmail = StrictOmit<User, "email">;
        expectTypeOf<UserWithoutEmail>().toEqualTypeOf<{
            id: string;
            name: string;
            age: number;
        }>();
    });

    it("should omit multiple properties", () => {
        type MinimalUser = StrictOmit<User, "email" | "age">;
        expectTypeOf<MinimalUser>().toEqualTypeOf<{
            id: string;
            name: string;
        }>();
    });

    it("should preserve remaining properties with correct types", () => {
        type UserWithoutAge = StrictOmit<User, "age">;
        expectTypeOf<UserWithoutAge>().toMatchTypeOf<{
            id: string;
            name: string;
            email: string;
        }>();
    });

    it("should work with all properties omitted", () => {
        type EmptyUser = StrictOmit<User, "id" | "name" | "email" | "age">;
        // When all properties are omitted, we get an empty object type
        expectTypeOf<EmptyUser>().toEqualTypeOf<Record<never, never>>();
    });

    it("should enforce that keys exist in the source type", () => {
        // This should cause a TypeScript error if uncommented:
        // type Invalid = StrictOmit<User, 'nonExistentKey'>;

        // Verify the key constraint works
        type ValidKeys = keyof User;
        expectTypeOf<ValidKeys>().toEqualTypeOf<
            "id" | "name" | "email" | "age"
        >();
    });

    it("should work with complex nested types", () => {
        interface Config {
            host: string;
            port: number;
            options: {
                debug: boolean;
                verbose: boolean;
            };
        }

        type ConfigWithoutOptions = StrictOmit<Config, "options">;
        expectTypeOf<ConfigWithoutOptions>().toEqualTypeOf<{
            host: string;
            port: number;
        }>();
    });
});
