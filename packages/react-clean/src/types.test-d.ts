import { expectTypeOf } from "vitest";
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

// Test that StrictOmit correctly omits a single property
type UserWithoutEmail = StrictOmit<User, "email">;
expectTypeOf<UserWithoutEmail>().toEqualTypeOf<{
    id: string;
    name: string;
    age: number;
}>();

// Test that StrictOmit correctly omits multiple properties
type UserWithoutEmailAndAge = StrictOmit<User, "email" | "age">;
expectTypeOf<UserWithoutEmailAndAge>().toEqualTypeOf<{
    id: string;
    name: string;
}>();

// Test that StrictOmit works with all properties omitted
type UserWithoutAll = StrictOmit<User, "id" | "name" | "email" | "age">;
expectTypeOf<UserWithoutAll>().toEqualTypeOf<Record<string, never>>();

// Test that StrictOmit preserves the remaining property types correctly
type AddressWithoutCountry = StrictOmit<Address, "country">;
expectTypeOf<AddressWithoutCountry>().toEqualTypeOf<{
    street: string;
    city: string;
}>();

// Test that StrictOmit enforces that keys must exist in the source type
// @ts-expect-error - 'nonExistent' is not a valid key of User
type InvalidOmit = StrictOmit<User, "nonExistent">;

// @ts-expect-error - 'foo' and 'bar' are not valid keys of Address
type InvalidMultipleOmit = StrictOmit<Address, "foo" | "bar">;

// Test that StrictOmit works with a mix of valid and invalid keys
// @ts-expect-error - 'invalid' is not a valid key of User
type MixedOmit = StrictOmit<User, "email" | "invalid">;

// Test that the result is assignable to the original type
const user: User = {
    id: "1",
    name: "John",
    email: "john@example.com",
    age: 30,
};
const userWithoutEmail: UserWithoutEmail = { id: "1", name: "John", age: 30 };

// @ts-expect-error - email property should not exist in UserWithoutEmail
const invalidUser: UserWithoutEmail = {
    id: "1",
    name: "John",
    email: "john@example.com",
    age: 30,
};

// Test that StrictOmit is compatible with Omit for valid keys
expectTypeOf<StrictOmit<User, "email">>().toEqualTypeOf<Omit<User, "email">>();
expectTypeOf<StrictOmit<Address, "city" | "country">>().toEqualTypeOf<
    Omit<Address, "city" | "country">
>();

// Test with empty object type
interface Empty {}
type EmptyOmit = StrictOmit<Empty, never>;
expectTypeOf<EmptyOmit>().toEqualTypeOf<Empty>();

// Test with readonly properties
interface ReadonlyUser {
    readonly id: string;
    readonly name: string;
}
type ReadonlyUserWithoutId = StrictOmit<ReadonlyUser, "id">;
expectTypeOf<ReadonlyUserWithoutId>().toEqualTypeOf<{
    readonly name: string;
}>();

// Test with optional properties
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
