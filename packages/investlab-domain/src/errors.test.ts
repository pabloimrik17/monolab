import { describe, expect, it } from "vitest";
import { NetworkError, PortfolioItemConflictError, UnauthorizedError } from "./errors.ts";

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

describe("PortfolioItemConflictError", () => {
    it("carries the PORTFOLIO_ITEM_CONFLICT code and names the item", () => {
        const error = new PortfolioItemConflictError("item-1");

        expect(error).toBeInstanceOf(Error);
        expect(error.code).toBe("PORTFOLIO_ITEM_CONFLICT");
        expect(error.name).toBe("PortfolioItemConflictError");
        expect(error.message).toBe(
            "Portfolio item item-1 was changed by another request; reload and try again",
        );
    });
});
