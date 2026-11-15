import { describe, expectTypeOf, test } from "vitest";
import { DomainError } from "./domain.error.ts";
import type { KernelError } from "./kernel.error.ts";
import type { RemotePortError } from "./remote-port.error.ts";

class ModuleError extends DomainError<"MODULE_ERROR"> {
    readonly code = "MODULE_ERROR";
}

describe("RemotePortError", () => {
    test("defaults to the kernel errors alone", () => {
        expectTypeOf<RemotePortError>().toEqualTypeOf<KernelError>();
    });

    test("adds a module's own errors to the kernel errors", () => {
        expectTypeOf<RemotePortError<ModuleError>>().toEqualTypeOf<KernelError | ModuleError>();
    });
});
