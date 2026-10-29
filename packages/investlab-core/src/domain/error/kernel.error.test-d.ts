import { describe, expectTypeOf, test } from "vitest";
import type { KernelError } from "./kernel.error.ts";
import type { NetworkError } from "./network.error.ts";
import type { PersistenceError } from "./persistence.error.ts";
import type { UnauthorizedError } from "./unauthorized.error.ts";
import type { ValidationError } from "./validation.error.ts";

describe("KernelError", () => {
    test("is the union of the four kernel errors", () => {
        expectTypeOf<KernelError>().toEqualTypeOf<
            ValidationError | PersistenceError | NetworkError | UnauthorizedError
        >();
    });
});
