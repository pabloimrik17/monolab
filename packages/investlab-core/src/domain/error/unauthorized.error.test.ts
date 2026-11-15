import { describe, expect, it } from "vitest";
import { UnauthorizedError } from "./unauthorized.error.ts";

describe("UnauthorizedError", () => {
    it("carries the UNAUTHORIZED code, a generic message and the cause", () => {
        const cause = { code: "UNAUTHORIZED" };

        const error = new UnauthorizedError(cause);

        expect(error).toBeInstanceOf(Error);
        expect(error.code).toBe("UNAUTHORIZED");
        expect(error.name).toBe("UnauthorizedError");
        expect(error.message).toBe("API rejected the bearer token");
        expect(error.cause).toBe(cause);
    });
});
