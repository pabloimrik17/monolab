import { describe, expectTypeOf, test } from "vitest";
import {
    DomainError,
    type KernelError,
    type NetworkError,
    type PersistenceError,
    type RemotePortError,
    type UnauthorizedError,
    type ValidationError,
} from "./errors.ts";

class ModuleError extends DomainError<"MODULE_ERROR"> {
    readonly code = "MODULE_ERROR";
}

describe("KernelError", () => {
    test("is the union of the four kernel errors", () => {
        expectTypeOf<KernelError>().toEqualTypeOf<
            ValidationError | PersistenceError | NetworkError | UnauthorizedError
        >();
    });
});

describe("RemotePortError", () => {
    test("defaults to the kernel errors alone", () => {
        expectTypeOf<RemotePortError>().toEqualTypeOf<KernelError>();
    });

    test("adds a module's own errors to the kernel errors", () => {
        expectTypeOf<RemotePortError<ModuleError>>().toEqualTypeOf<KernelError | ModuleError>();
    });
});
