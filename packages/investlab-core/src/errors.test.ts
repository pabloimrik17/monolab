import { describe, expect, it } from "vitest";
import { NetworkError, UnauthorizedError } from "./errors.ts";

describe("NetworkError", () => {
    it("carries the NETWORK_ERROR code, a generic message and the cause", () => {
        const cause = new TypeError("fetch failed");

        const error = new NetworkError(cause);

        expect(error).toBeInstanceOf(Error);
        expect(error.code).toBe("NETWORK_ERROR");
        expect(error.name).toBe("NetworkError");
        expect(error.message).toBe("API request failed");
        expect(error.cause).toBe(cause);
    });
});

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
