import { describe, expectTypeOf, it } from "vitest";
import type { StrictOmit } from "./types.ts";

interface User {
    id: string;
    name: string;
    email: string;
    age: number;
}

interface Address {
    street: string;
    city: string;
    country: string;
}

describe("StrictOmit", () => {
    it("should omit keys and preserve the rest", () => {
        type UserWithoutEmail = StrictOmit<User, "email">;
        expectTypeOf<UserWithoutEmail>().toEqualTypeOf<{
            id: string;
            name: string;
            age: number;
        }>();

        type UserWithoutEmailAndAge = StrictOmit<User, "email" | "age">;
        expectTypeOf<UserWithoutEmailAndAge>().toEqualTypeOf<{
            id: string;
            name: string;
        }>();

        type UserWithoutAll = StrictOmit<User, "id" | "name" | "email" | "age">;
        expectTypeOf<UserWithoutAll>().toEqualTypeOf<{}>();

        type AddressWithoutCountry = StrictOmit<Address, "country">;
        expectTypeOf<AddressWithoutCountry>().toEqualTypeOf<{
            street: string;
            city: string;
        }>();

        // @ts-expect-error - 'nonExistent' is not a valid key of User
        type InvalidOmit = StrictOmit<User, "nonExistent">;

        // @ts-expect-error - 'foo' and 'bar' are not valid keys of Address
        type InvalidMultipleOmit = StrictOmit<Address, "foo" | "bar">;

        // @ts-expect-error - 'invalid' is not a valid key of User
        type MixedOmit = StrictOmit<User, "email" | "invalid">;

        const user: User = {
            id: "1",
            name: "John",
            email: "john@example.com",
            age: 30,
        };
        const userWithoutEmail: UserWithoutEmail = {
            id: "1",
            name: "John",
            age: 30,
        };
        expectTypeOf(user).toEqualTypeOf<User>();
        expectTypeOf(userWithoutEmail).toEqualTypeOf<UserWithoutEmail>();

        const invalidUser: UserWithoutEmail = {
            id: "1",
            name: "John",
            // @ts-expect-error - email property should not exist in UserWithoutEmail
            email: "john@example.com",
            age: 30,
        };
        expectTypeOf(invalidUser).toEqualTypeOf<UserWithoutEmail>();

        expectTypeOf<StrictOmit<User, "email">>().toEqualTypeOf<Omit<User, "email">>();
        expectTypeOf<StrictOmit<Address, "city" | "country">>().toEqualTypeOf<
            Omit<Address, "city" | "country">
        >();

        interface Empty {}
        type EmptyOmit = StrictOmit<Empty, never>;
        expectTypeOf<EmptyOmit>().toEqualTypeOf<Empty>();

        interface ReadonlyUser {
            readonly id: string;
            readonly name: string;
        }
        type ReadonlyUserWithoutId = StrictOmit<ReadonlyUser, "id">;
        expectTypeOf<ReadonlyUserWithoutId>().toEqualTypeOf<{
            readonly name: string;
        }>();

        interface OptionalUser {
            id: string;
            name?: string;
            email?: string;
        }
        type OptionalUserWithoutEmail = StrictOmit<OptionalUser, "email">;
        expectTypeOf<OptionalUserWithoutEmail>().toEqualTypeOf<{
            id: string;
            name?: string;
        }>();
    });
});
